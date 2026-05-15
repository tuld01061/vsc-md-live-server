const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const source = `
\`\`\`mermaid
graph TD
    subgraph Sub1 [乗船前 - 電波あり: 港・チケット売り場]
        A1[乗客のスマホ] -->|QR読み取り| B1(PWAサイトへアクセス)
        B1 --> C1[Service Workerが起動]
        C1 -->|HTML/JS/画像/ハードコードデータを| D1[(スマホ内にキャッシュ保存)]
    end
\`\`\`
`;

console.log(md.render(source));
