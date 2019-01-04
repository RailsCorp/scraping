const fs = require('fs')
const puppeteer = require('puppeteer')
const { PAGE_URL, PUPPETEER_CONFIG, COURSE_ITEM_DICTIONARY } = require('./constants')
const { logger } = require('./util/winston')
const { URL } = require('url')
const timeout = 15000

exports.fetchCourseData = async (faculty) => {
  const config = process.env.CI ? PUPPETEER_CONFIG.ci : PUPPETEER_CONFIG.local
  const browser = await puppeteer.launch(config)
  const page = await browser.newPage()

  // MyWasedaログイン
  await page.goto(PAGE_URL.mywaseda)
  await page.click('a[id="btnLogin"]')
  await page.waitForFunction(() => {
    const locationCondition = window.location.pathname.startsWith("/idp/profile/SAML2/Redirect/SSO")
    const readyStateCondition = window.document.readyState === 'interactive' || window.document.readyState === 'complete'
    return locationCondition && readyStateCondition
  })
  await page.evaluate((id, pass) => {
    document.getElementById("j_username").value = id;
    document.getElementById("j_password").value = pass;
    document.getElementById("btn-save").click();
  }, process.env.MW_USERNAME, process.env.MW_PASSWORD)
  await page.waitForFunction(() => {
    const locationCondition = window.location.href === 'https://my.waseda.jp/portal/view/portal-top-view'
    const readyStateCondition = window.document.readyState === 'interactive' || window.document.readyState === 'complete'
    return locationCondition && readyStateCondition
  })
  logger.info('MyWasedaにログインしました')

  // シラバス検索ページ
  await page.goto(PAGE_URL.syllabus_search)
  await page.waitForSelector('select[name="p_gakubu"]', { timeout, waitUntil: "domcontentloaded" })
  await page.evaluate(code => {
    document.querySelector('select[name="p_gakubu"]').value = code;
    func_search('JAA103SubCon');
  }, faculty.id)
  logger.info('学部絞り込みでシラバスを検索しました')

  await page.waitForFunction(() => window.document.readyState === 'interactive' || window.document.readyState === 'complete')
  await page.evaluate(() => func_showchg('JAA103SubCon', '100'))

  let pageNo = 1, courseCount = 0
  while(true) {
    await page.waitForFunction(() => window.document.readyState === 'interactive' || window.document.readyState === 'complete')

    // 1セット(100件)分の講義IDを取得
    const pKeys = await page.evaluate(() => {
      const table = document.querySelector('.ct-vh > tbody')
      const anchorList = table.querySelectorAll('td > a')
      let keys = [], postSubmit
      anchorList.forEach(_node => {
        postSubmit = _node.getAttribute("onclick").match(/post_submit\('.+', '(.+)'\)/)
        keys.push(postSubmit[1])
      })
      return keys
    })

    const detailTab = await browser.newPage()
    let dataset = [], detailURL = new URL(PAGE_URL.syllabus_detail)

    // 1セット分の講義データ取得
    for(const pKey of pKeys) {
      detailURL.searchParams.set('pKey', pKey)
      await detailTab.goto(detailURL.href)
      await page.waitForFunction(() => window.document.readyState === 'interactive' || window.document.readyState === 'complete')
      await page.waitFor(500)

      // 1講義データ取得
      const classData = await detailTab.evaluate(dict => {
        let keys = [], data = {}, i = 0

        // 基本データ取得
        const basicTable = document.querySelectorAll('.ctable-main')[0]
        basicTable.querySelectorAll("th").forEach(node => {
          const text = node.innerHTML.replace(/\s+/g, '')
          if(text != "&nbsp;" || !text) keys.push(dict.find(item => item.jp === text).en)
        })

        basicTable.querySelectorAll("td").forEach(node => {
          // 改行と行頭末の空白除去・全角英数字を半角に変換
          const text = node.innerText
            .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248))
            .replace(/\r?\n/g, '')
            .replace(/^\s+/g, '')
            .replace(/\s+$/g, '')

          // オープン科目判定(thが空文字のため個別対応)
          if(text.startsWith("オープン科目")) {
            data.open_course = true
          } else {
            data[keys[i++]] = text
          }
        })
        if(!data.open_course) data.open_course = false

        // 詳細データ取得
        const detailTable = document.querySelectorAll('.ctable-main')[1]
        detailTable.querySelectorAll(':scope > .ct-sirabasu > tbody > tr').forEach(tr => {
          if(!tr.querySelector(':scope > th')) return
          const itemName = tr.querySelector(':scope > th').innerText
          const item = dict.find(item => item.jp === itemName)
          if(!item) return

          let itemDetail
          if(item.en === 'evaluation_method') {
            let gradeEvaluateMethods = []
            tr.querySelectorAll(':scope > td > table tr:not(.c-vh-title)').forEach(node => {
              const keys = ['name', 'rate', 'detail']
              let method = {}
              node.querySelectorAll('td').forEach((value, index) => {
                method[keys[index]] = value.innerText
                  .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248))
                  .replace(/^\s+/g, '')
                  .replace(/\s+$/g, '')
                  .replace(/:$/, '')
              })
              gradeEvaluateMethods.push(method)
            })
            itemDetail = gradeEvaluateMethods
          } else {
            itemDetail = tr.querySelector(':scope > td').innerText
              .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248))
              .replace(/^\s+/g, '')
              .replace(/\s+$/g, '')
          }
          data[item.en] = itemDetail
        })
        return data
      }, COURSE_ITEM_DICTIONARY)

      logger.info(`${++courseCount}. ${classData.name} ${detailURL.href}`)
      dataset.push(classData)
    }

    await detailTab.close()
    let nextBtn = await page.$('#cHonbun > .l-btn-c > table > tbody > tr > td:last-child a')
    const jsonFilePath = `./data/${faculty.slug}_${pageNo}.json`

    // メモリリークするため1ループずつファイルに書き出し(100件ずつ)
    fs.appendFile(jsonFilePath, JSON.stringify(dataset), error => {
      if (error) logger.error(error.message)
    })

    // 次ページがあればページネーション呼び出し
    if(!nextBtn) break
    await page.evaluate(pageNo => {
      page_turning('JAA103SubCon', String(pageNo))
    }, ++pageNo)
  }

  await browser.close();
}
