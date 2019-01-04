const { FACULTIES } = require('./constants');
const { fetchCourseData } = require('./fetch-course');
const { logger } = require('./util/winston');
const TARGET = process.env.FETCH_TARGET || 'all';

(async() => {
  // 環境変数で収集する学部を指定
  let targetFaculties
  if(TARGET === 'all') {
    targetFaculties = FACULTIES
  } else {
    let targets = TARGET.split(',')
    targetFaculties = FACULTIES.filter(faculty => targets.includes(faculty.slug))
  }

  for(const faculty of targetFaculties) {
    logger.info(`${faculty.name}の講義データを取得します`)
    try {
      await fetchCourseData(faculty)
    } catch(e) {
      console.log(e)
      logger.error(e.message)
    }
  }
})()
