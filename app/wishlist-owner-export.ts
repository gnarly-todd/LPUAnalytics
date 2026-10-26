import { zipSync, strToU8 } from "fflate";
import exportStyles from "./wishlist-export-styles.json";
import {
  matchWishlistOwners,
  sortWishlistRows,
  type WishlistProfile,
} from "./wishlist-owner-utils";
import type { LockRecord } from "./data";

export type WishlistExportOptions = {
  totalProfiles: number;
  failedNames: string[];
  searchScope: string;
  leaderboardUpdatedAt: string;
  demand: { counts: Record<string, number>; updatedAt: string };
};
const namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const wishlistHeaders = [
  "Lock",
  "Version",
  "Belt",
  "Matched owners",
  "Public wishlists",
  "Status",
  "Notes",
  "Lock ID",
  "Belt order",
];
const matchHeaders = [
  "Lock",
  "Version",
  "Belt",
  "Owner name",
  "Owner profile URL",
  "Lock ID",
  "Owner count",
  "Published wishlist count",
  "Owner refreshed at",
  "Wishlist profile",
  "Wishlist profile ID",
  "Owner profile ID",
  "Owner profile URL (source)",
  "Wishlist refreshed at",
  "Profiles loaded",
  "Profiles searched (excluding active)",
  "Failed profiles",
  "Search scope",
  "Leaderboard updated at (source time)",
  "Wishlist demand source updated at",
  "Belt order",
];
const wishlistWidths = [42, 32, 13, 16, 17, 19, 45, 15, 14];
const matchWidths = [
  42, 32, 13, 76, 40, 15, 15, 18, 29, 20, 34, 34, 65, 34, 16, 19, 22, 60, 34, 34, 14,
];
type Style = keyof typeof exportStyles.styles;
type Cell = { value: string | number; formula?: string; style?: Style };
// XML 1.0 excludes these control characters; retain tab, newline and carriage return.
const text = (value: unknown) =>
  // oxlint-disable-next-line no-control-regex
  String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
const escape = (value: unknown) =>
  text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const column = (index: number) => String.fromCharCode(65 + index);

export function wishlistExportBeltOrder(lock: LockRecord): number {
  const rank = [
    "Unranked",
    "White",
    "Yellow",
    "Orange",
    "Green",
    "Blue",
    "Purple",
    "Brown",
    "Red",
    "Black",
  ].indexOf(lock.belt);
  return (
    rank + (lock.belt === "Black" ? Number(lock.beltLevel?.match(/[1-5]$/)?.[0] ?? 0) / 10 : 0)
  );
}

function cell(address: string, item: Cell): string {
  const style = exportStyles.styles[item.style ?? "body"];
  const attrs = `r="${address}" s="${style}"`;
  if (item.formula)
    return `<c ${attrs}><f>${escape(item.formula)}</f><v>${Number(item.value)}</v></c>`;
  if (typeof item.value === "number" && Number.isFinite(item.value))
    return `<c ${attrs}><v>${item.value}</v></c>`;
  if (text(item.value).length > 32767)
    throw new Error(
      "An export cell exceeds Excel’s text limit. Shorten the profile or lock names and try again.",
    );
  // All user-supplied strings remain literal text, including names beginning with =.
  return `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${escape(item.value)}</t></is></c>`;
}
function row(index: number, cells: Cell[], height = 28) {
  return `<row r="${index}" ht="${height}" customHeight="1">${cells.map((value, col) => cell(`${column(col)}${index}`, value)).join("")}</row>`;
}
const note = (index: number, value: string) => row(index, [{ value, style: "note" }], 24);
function worksheet(
  headers: string[],
  widths: number[],
  title: string,
  notes: string[],
  data: Cell[][],
  heights: number[],
  first: boolean,
) {
  const lastColumn = column(headers.length - 1);
  const presentationColumn = first ? lastColumn : "H";
  const end = Math.max(9, data.length + 8);
  const summary = first
    ? row(
        6,
        [
          { value: notes[2], style: "note" },
          { value: "" },
          { value: "" },
          { value: data.length, formula: `COUNTA(H9:H${end})`, style: "number" },
          { value: "lock entries", style: "note" },
          { value: 0, formula: `COUNTIFS(F9:F${end},"Acquired")`, style: "number" },
          { value: "acquired", style: "note" },
        ],
        24,
      )
    : note(6, notes[2]);
  const merges = [
    `A2:${presentationColumn}2`,
    `A4:${presentationColumn}4`,
    `A5:${presentationColumn}5`,
    first ? "A6:C6" : `A6:${presentationColumn}6`,
  ];
  return `${xmlHeader}<worksheet xmlns="${namespace}" xmlns:r="${relationships}"><dimension ref="A1:${lastColumn}${end}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane xSplit="1" ySplit="8" topLeftCell="B9" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B9" sqref="B9"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols>${widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${row(1, [], 20)}${row(2, [{ value: title, style: "title" }], 32)}${row(3, [], 18)}${note(4, notes[0])}${note(5, notes[1])}${summary}${row(7, [], 20)}${row(
    8,
    headers.map((value) => ({ value, style: "header" })),
    36,
  )}${
    data.length
      ? data.map((cells, i) => row(i + 9, cells, heights[i])).join("")
      : row(
          9,
          headers.map(() => ({ value: "" })),
        )
  }</sheetData><mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>${first ? `<conditionalFormatting sqref="F9:F${end}"><cfRule type="expression" dxfId="0" priority="1"><formula>F9="Acquired"</formula></cfRule></conditionalFormatting><dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Choose a status" error="Select a status from the list." sqref="F9:F${end}"><formula1>"Wanted,Contacted,Pending,Acquired,On hold"</formula1></dataValidation></dataValidations>` : ""}<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/><tableParts count="1"><tablePart r:id="table"/></tableParts></worksheet>`;
}
function table(id: number, name: string, headers: string[], length: number) {
  const ref = `A8:${column(headers.length - 1)}${Math.max(9, length + 8)}`;
  return `${xmlHeader}<table xmlns="${namespace}" id="${id}" name="${name}" displayName="${name}" ref="${ref}" totalsRowShown="0"><autoFilter ref="${ref}"/><tableColumns count="${headers.length}">${headers.map((header, i) => `<tableColumn id="${i + 1}" name="${escape(header)}"/>`).join("")}</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/></table>`;
}

/** Native XLSX tracker matching the supplied two-sheet workbook; no network requests. */
export function wishlistOwnersWorkbook(
  active: WishlistProfile,
  loaded: WishlistProfile[],
  options: WishlistExportOptions,
): Uint8Array<ArrayBuffer> {
  const records = sortWishlistRows(matchWishlistOwners(active, loaded), {
    key: "rank",
    direction: "asc",
  });
  const loadedCount = new Set(
    loaded.filter((profile) => profile.id !== active.id).map((profile) => profile.id),
  ).size;
  const end = Math.max(9, records.length + 8);
  const wishlist: Cell[][] = [];
  const matches: Cell[][] = [];
  const wishlistHeights: number[] = [];
  const matchHeights: number[] = [];
  records.forEach(({ lock, owners }, i) => {
    const r = i + 9;
    const alt = i % 2 === 0;
    const body: Style = alt ? "bodyAlt" : "body";
    const wrapped: Style = alt ? "wrappedAlt" : "wrapped";
    const number: Style = alt ? "numberAlt" : "number";
    const belt = { value: lock.beltLevel ?? lock.belt, style: `belt${lock.belt}` as Style };
    const count = owners.length;
    const demand = options.demand.counts[lock.id] ?? 0;
    const rank = wishlistExportBeltOrder(lock);
    const names = owners.map((owner) => owner.name).join(", ");
    const urls = owners.map((owner) => owner.url).join(", ");
    const base: Cell[] = [
      { value: lock.name, style: wrapped },
      { value: lock.version ?? "", style: wrapped },
      belt,
    ];
    wishlist.push([
      ...base,
      {
        value: count,
        formula: `INDEX('Owner matches'!$G$9:$G$${end},MATCH(H${r},'Owner matches'!$F$9:$F$${end},0))`,
        style: number,
      },
      {
        value: demand,
        formula: `INDEX('Owner matches'!$H$9:$H$${end},MATCH(H${r},'Owner matches'!$F$9:$F$${end},0))`,
        style: number,
      },
      { value: "Wanted", style: "input" },
      { value: "", style: "input" },
      { value: lock.id, style: body },
      { value: rank, style: "decimal" },
    ]);
    matches.push([
      ...base,
      { value: names || "No matches among loaded profiles", style: wrapped },
      { value: urls, style: body },
      { value: lock.id, style: body },
      { value: count, style: number },
      { value: demand, style: number },
      { value: owners.map((owner) => owner.refreshedAt).join(", "), style: body },
      { value: active.name, style: body },
      { value: active.id, style: body },
      { value: owners.map((owner) => owner.id).join(", "), style: body },
      { value: urls, style: body },
      { value: active.refreshedAt, style: body },
      { value: loadedCount, style: number },
      { value: options.totalProfiles, style: number },
      { value: options.failedNames.join(", "), style: body },
      { value: options.searchScope, style: body },
      { value: options.leaderboardUpdatedAt, style: body },
      { value: options.demand.updatedAt, style: body },
      { value: rank, style: "decimal" },
    ]);
    const baseHeight = Math.max(
      28,
      Math.ceil(lock.name.length / 39) * 16,
      Math.ceil((lock.version?.length ?? 0) / 28) * 16,
    );
    wishlistHeights.push(Math.min(409, baseHeight));
    matchHeights.push(Math.min(409, Math.max(baseHeight, Math.ceil(names.length / 70) * 16 + 12)));
  });
  const coverage = `${loadedCount} of ${options.totalProfiles} profiles loaded${options.failedNames.length ? `; ${options.failedNames.length} failed` : ""}`;
  const files: Record<string, Uint8Array> = {};
  const add = (name: string, xml: string) => {
    files[name] = strToU8(xml);
  };
  add(
    "[Content_Types].xml",
    `${xmlHeader}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${[1, 2].map((n) => `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`).join("")}</Types>`,
  );
  add(
    "_rels/.rels",
    `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="workbook" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  add(
    "xl/workbook.xml",
    `${xmlHeader}<workbook xmlns="${namespace}" xmlns:r="${relationships}"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Wishlist" sheetId="1" r:id="sheet1"/><sheet name="Owner matches" sheetId="2" r:id="sheet2"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
  );
  add(
    "xl/_rels/workbook.xml.rels",
    `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[1, 2].map((n) => `<Relationship Id="sheet${n}" Type="${relationships}/worksheet" Target="worksheets/sheet${n}.xml"/>`).join("")}<Relationship Id="styles" Type="${relationships}/styles" Target="styles.xml"/></Relationships>`,
  );
  add("xl/styles.xml", exportStyles.xml);
  add(
    "xl/worksheets/sheet1.xml",
    worksheet(
      wishlistHeaders,
      wishlistWidths,
      `${active.name} wishlist`,
      [
        "Sorted easiest to hardest. Use Belt order to re-sort. Edit amber Status and Notes cells.",
        "Owner counts update from Owner matches. Public wishlists show published demand, not matched owners.",
        coverage,
      ],
      wishlist,
      wishlistHeights,
      true,
    ),
  );
  add(
    "xl/worksheets/sheet2.xml",
    worksheet(
      matchHeaders,
      matchWidths,
      "Wishlist owner matches",
      [
        `${active.name}: ${records.length} wishlist locks, ${records.filter((record) => !record.owners.length).length} without matches. ${coverage}.`,
        "One row per lock, with owner names separated by commas. Edit Owner count to update the Wishlist tracker.",
        "Source: LPU Belts public user API and leaderboard. Saved snapshot only; this workbook does not fetch live data.",
      ],
      matches,
      matchHeights,
      false,
    ),
  );
  [wishlistHeaders, matchHeaders].forEach((headers, i) => {
    const n = i + 1;
    add(`xl/tables/table${n}.xml`, table(n, i ? "Matches" : "Wishlist", headers, records.length));
    add(
      `xl/worksheets/_rels/sheet${n}.xml.rels`,
      `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="table" Type="${relationships}/table" Target="../tables/table${n}.xml"/></Relationships>`,
    );
  });
  return new Uint8Array(zipSync(files, { level: 6 }));
}
