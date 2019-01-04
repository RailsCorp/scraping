const PAGE_URL = {
  mywaseda: 'https://my.waseda.jp/login/login',
  syllabus_search: 'https://www.wsl.waseda.jp/syllabus/JAA101.php?pLng=jp',
  syllabus_detail: 'https://www.wsl.waseda.jp/syllabus/JAA104.php?pLang=jp'
}

const FACULTIES = [
  { name: '政治経済学部', slug: 'pse', id: '111973' },
  { name: '法学部', slug: 'law', id: '121973' },
  { name: '文化構想学部', slug: 'cms', id: '232006' },
  { name: '文学部', slug: 'hss', id: '242006' },
  { name: '教育学部', slug: 'edu', id: '151949' },
  { name: '商学部', slug: 'soc', id: '161973' },
  { name: '基幹理工学部', slug: 'fse', id: '262006' },
  { name: '創造理工学部', slug: 'cse', id: '272006' },
  { name: '先進理工学部', slug: 'ase', id: '282006' },
  { name: '社会科学部', slug: 'sss', id: '181966' },
  { name: '人間科学部', slug: 'hum', id: '192000' },
  { name: 'スポーツ科学部', slug: 'sps', id: '202003' },
  { name: '国際教養学部', slug: 'sils', id: '212004' },
  { name: 'グローバル', slug: 'global', id: '9S2013' }
]

const PUPPETEER_CONFIG = {
  local: { headless: false, slowMo: 20 },
  ci: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
}

const COURSE_ITEM_DICTIONARY = [
  { en: "year", jp: "開講年度" },
  { en: "place", jp: "開講箇所" },
  { en: "name", jp: "科目名" },
  { en: "professor", jp: "担当教員" },
  { en: "time", jp: "学期曜日時限" },
  { en: "category", jp: "科目区分" },
  { en: "target_grade", jp: "配当年次" },
  { en: "credit", jp: "単位数" },
  { en: "classroom", jp: "使用教室" },
  { en: "campus", jp: "キャンパス" },
  { en: "key", jp: "科目キー" },
  { en: "class_code", jp: "科目クラスコード" },
  { en: "language", jp: "授業で使用する言語" },
  { en: "course_code", jp: "コース・コード" },
  { en: "field_large", jp: "大分野名称" },
  { en: "field_middle", jp: "中分野名称" },
  { en: "field_small", jp: "小分野名称" },
  { en: "level", jp: "レベル" },
  { en: "form", jp: "授業形態" },
  { en: "subtitle", jp: "副題" },
  { en: "overview", jp: "授業概要" },
  { en: "goal", jp: "授業の到達目標" },
  { en: "plan", jp: "授業計画" },
  { en: "textbook", jp: "教科書" },
  { en: "reference", jp: "参考文献" },
  { en: "evaluation_method", jp: "成績評価方法" },
  { en: "remarks", jp: "備考・関連URL" },
  { en: "self_study", jp: "事前・事後学習の内容" }
]

module.exports = { PAGE_URL, FACULTIES, PUPPETEER_CONFIG, COURSE_ITEM_DICTIONARY }
