require('dotenv').config();
const pptr = require('puppeteer');
const url = require('url');
const Json2csvParser = require('json2csv').Parser
const fs = require('fs')
const path = require('path')
const iconv = require('iconv-lite')

async function run(){
    const browser = await pptr.launch({ headless: false });
    // const browser = await pptr.launch({});
    const page = await browser.newPage()
    // await page.setViewport({ width: 640, height: 720 })

    // MyWasedaログイン
    await page.goto('https://my.waseda.jp/login/login')
    const loginElement = await page.$('a[id="btnLogin"]')
    loginElement.click();
    await page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"})
    await page.type('input[name="j_username"]', process.env.MW_USERNAME)
    await page.type('input[name="j_password"]', process.env.MW_PASSWORD)
    const buttonElement = await page.$('input[type=submit]')
    buttonElement.click()
    await page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"})
    console.log("logined")

    // シラバス検索ページ
    await page.goto('https://www.wsl.waseda.jp/syllabus/JAA101.php?pLng=jp', {waitUntil: "domcontentloaded"})
    await page.select('select[name="p_gakubu"]', '262006')
    await page.waitForSelector('select[name="p_keya"]')
    await page.select('select[name="p_keya"]', '2601004')
    await page.waitFor(500)
    page.click('input[name="btnSubmit"]')
    await page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"})
    console.log("serched")
    await page.evaluate(() => {
        func_showchg('JAA103SubCon', '10')
    });

    let allData = []
    // シラバスURL
    var u = new url.Url()
    u.protocol = 'https'
    u.host = 'www.wsl.waseda.jp'
    u.pathname = '/syllabus/JAA104.php'

    while(1) {
        await page.waitFor(1000)
        let pKeys = await page.evaluate(() => {
            const table = document.querySelector('.ct-vh > tbody')
            const anchorList = table.querySelectorAll('td > a')
            let keys = [], post_submit
            anchorList.forEach(_node => {
                post_submit = _node.getAttribute("onclick").match(/post_submit\('.+', '(.+)'\)/)
                keys.push(post_submit[1])
            })
            return keys
        });

        for(pKey of pKeys) {
            u.query = { pLang: 'jp', pKey: pKey }
            const syllabusTab = await browser.newPage()
            const request = u.format()
            await syllabusTab.goto(request)
            await syllabusTab.waitFor(1000)

            const classData = await syllabusTab.evaluate(() => {
                table = document.querySelector('.ct-sirabasu')
                let keys = [], data = {}, i = 0
                table.querySelectorAll("th").forEach(node => {
                    text = node.innerHTML
                    if(text != "&nbsp;") keys.push(text)
                })
                table.querySelectorAll("td").forEach(node => {
                    data[keys[i++]] = node.innerHTML.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'')
                })
                return data
            })
            await allData.push(classData)
            await syllabusTab.close()
        }

        const nextBtn = await page.$('#cHonbun > .l-btn-c > table > tbody > tr > td:last-child a')
        if(!nextBtn) break
        nextBtn.click()
    }

    const fields = Object.keys(allData[0])
    const opts = { fields };
    const parser = new Json2csvParser(opts);
    const csv = parser.parse(allData);

    fs.writeFile("class_data.csv", csv, (err) => {
        if(err){
            console.log("エラーが発生しました。" + err)
            throw err
        }else{
            console.log("ファイルが正常に書き出しされました")
        }
    })
    await browser.close();
}

run()

