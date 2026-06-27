/* ============================================================
   큐핏 단일 파일 빌드 스크립트
   prototype/{index.html, css/styles.css, js/app.js} 를 합쳐
   루트에 단일 HTML(qpit.html)을 생성한다.
   다운로드 후 더블클릭만으로 (서버 없이) 동작.

   실행:  node prototype/build.js
   ============================================================ */
const fs = require("fs");
const path = require("path");

const dir = __dirname; // prototype/
const read = (p) => fs.readFileSync(path.join(dir, p), "utf8");

const html = read("index.html");
const css = read("css/styles.css");
const js = read("js/app.js");

const banner =
  "<!-- 큐핏 단일 파일 데모 — prototype/build.js 로 자동 생성됨.\n" +
  "     수정은 prototype/ 소스 파일에서 하고 다시 빌드하세요. -->\n";

let out = html
  .replace(
    '<link rel="stylesheet" href="css/styles.css" />',
    "<style>\n" + css + "\n</style>"
  )
  .replace(
    '<script src="js/app.js"></script>',
    "<script>\n" + js + "\n</script>"
  )
  .replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + banner);

const outPath = path.join(dir, "..", "qpit.html");
fs.writeFileSync(outPath, out, "utf8");

// 인라인 확인
const ok =
  out.includes("<style>") &&
  out.includes("<script>\n") &&
  !out.includes('href="css/styles.css"') &&
  !out.includes('src="js/app.js"');

console.log(
  (ok ? "✅" : "⚠️") +
    " qpit.html 생성 완료 — " +
    out.length +
    " bytes" +
    (ok ? "" : " (인라인 누락 의심!)")
);
