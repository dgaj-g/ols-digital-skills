/**
 * Build the Mendeleev's Cards access card (A4 single page).
 *
 * Run:
 *   NODE_PATH=$(npm root -g) node access-card.js
 *
 * Output:
 *   /Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/
 *     0. Digital Skills Web Activities/Chemistry/Mendeleev_Cards_Access.docx
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign
} = require('docx');

const BLUE   = '1A3A6B';
const GOLD   = 'E4B824';
const BORDER = '595959';
const TEXT   = '222222';
const MUTED  = '595959';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const crestPath = path.join(REPO_ROOT, 'assets', 'crest.png');
const qrPath = path.join(__dirname, 'qr.png');
const outPath = "/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Chemistry/Mendeleev_Cards_Access.docx";

const qrPng = fs.readFileSync(qrPath);
const crestPng = fs.readFileSync(crestPath);

const para = (children, opts = {}) => new Paragraph({ children, ...opts });
const run  = (text, opts = {}) => new TextRun({ text, font: 'Calibri', ...opts });
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const allNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

const accessTable = new Table({
  width: { size: 9026, type: WidthType.DXA },
  columnWidths: [3200, 5826],
  borders: allNoBorder,
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3200, type: WidthType.DXA },
          borders: allNoBorder,
          margins: { top: 0, bottom: 0, left: 0, right: 200 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({
                type: 'png',
                data: qrPng,
                transformation: { width: 180, height: 180 },
                altText: { title: 'QR code', description: 'Scan to open Mendeleev\'s Cards activity', name: 'QR code' }
              })]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80 },
              children: [run('Scan with phone camera', { size: 18, italics: true, color: MUTED })]
            })
          ]
        }),
        new TableCell({
          width: { size: 5826, type: WidthType.DXA },
          borders: allNoBorder,
          margins: { top: 0, bottom: 0, left: 200, right: 0 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            para([run('Open the activity', { size: 24, bold: true, color: BLUE })],
                 { spacing: { after: 80 } }),
            para([run('On any phone, Chromebook or the Promethean board:', { size: 20, color: TEXT })],
                 { spacing: { after: 140 } }),
            para([run('https://dgaj-g.github.io/ols-digital-skills/chemistry/mendeleev-cards/', { size: 22, bold: true, color: BLUE, font: 'Consolas' })],
                 { spacing: { after: 200 } }),
            para([run('No login. Works on touch and mouse. Nothing to install.', { size: 18, italics: true, color: MUTED })])
          ]
        })
      ]
    })
  ]
});

const goldRule = (after = 200) => para([], {
  border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 1 } },
  spacing: { after }
});
const greyRule = (after = 200) => para([], {
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER, space: 1 } },
  spacing: { after }
});

const step = (n, head, body) => [
  para([
    run(`${n}.  `, { size: 22, bold: true, color: BLUE }),
    run(head, { size: 22, bold: true, color: TEXT }),
  ], { spacing: { before: 100, after: 40 } }),
  para([run(body, { size: 20, color: TEXT })],
       { spacing: { after: 0 }, indent: { left: 360 } })
];

const doc = new Document({
  creator: 'OLS Digital Skills',
  title: "Mendeleev's Cards — access card",
  description: 'OLS Digital Skills, Chemistry GCSE',
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1100, right: 1100, bottom: 1000, left: 1100 }
      }
    },
    children: [
      para([run('OLS DIGITAL SKILLS', { size: 18, bold: true, color: GOLD, characterSpacing: 80 })],
           { spacing: { after: 60 } }),
      para([run("Mendeleev's Cards", { size: 44, bold: true, color: BLUE })],
           { spacing: { after: 40 } }),
      para([run('Chemistry  ·  GCSE  ·  Built for the OLS Chemistry Department', { size: 20, color: MUTED })],
           { spacing: { after: 160 } }),
      goldRule(280),

      accessTable,
      para([], { spacing: { before: 200 } }),
      greyRule(180),

      para([run('How to play', { size: 26, bold: true, color: BLUE })],
           { spacing: { after: 120 } }),

      ...step(1, 'Look at the grid.',
        "It has 5 rows and 7 columns — a blank periodic table waiting to be filled. Some cells are hatched (shaded). Those are the gaps Mendeleev left for elements that hadn't been discovered yet."),
      ...step(2, 'Sort the 22 cards.',
        'Drag each element card from the tray onto the grid. Order them from lightest to heaviest — left to right, top to bottom. Use the small atomic-weight number in the top-right of each card as your guide.'),
      ...step(3, 'Drop it in the right place.',
        'Correct → the card snaps in with a soft chime. Wrong → the card bounces gently back to the tray. Try again.'),
      ...step(4, 'Tap any card for the full info.',
        "A short tap (no drag) opens a card's full data: appearance, discovery, melting and boiling points, density, reactions with water and air, plus photographs."),
      ...step(5, 'Place all 22 to reveal the pattern.',
        "When the last card lands, the columns light up in their group colours and the group names appear. Look at each column — elements that share a column share their chemistry. That's the pattern Mendeleev spotted in 1869."),
      ...step(6, 'Reset and try again.',
        'The Reset button at the top shuffles the cards back into the tray and clears the grid.'),

      para([], { spacing: { before: 240 } }),
      greyRule(120),
      // ----- Footer: OLS Digital Skills brand mark only -----
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: 'png',
            data: crestPng,
            transformation: { width: 18, height: 20 },
            altText: { title: 'OLS crest', description: "Our Lady's Grammar School crest", name: 'crest' }
          }),
          run('   OLS Digital Skills', { size: 18, color: MUTED, bold: true })
        ]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Wrote', outPath);
});
