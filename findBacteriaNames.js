const csv = require("csv-parser");
const fs = require("fs");
const fixTypos = require("./fixTypos");
const generaNames = require("./generaNames");
const valid = [];
const invalid = [];
const unmatched = [];
const invalidSet = new Set();
const unmatchedSet = new Set();
const validSet = new Set();
let totalCount = 0;

const bacteriaRegExp = new RegExp(
  generaNames.map((name) => name + " ([a-z]{4,}|sp)").join("|"),
  "g"
);

function fixTyposAndFindBacteria(column) {
  if (!column) {
    return null;
  }
  const fixed = fixTypos(column);
  return fixed.match(bacteriaRegExp);
}

const invalidBacteriaNameRegExp = new RegExp(
  [
    "plant",
    "symbiont",
    "toxin",
    "degrading",
    "isolated",
    "like",
    "soil",
    "reductio",
  ]
    .map((word) => " " + word + "$")
    .join("|")
);

function isInvalidBacteriaName(name) {
  return !!name.match(invalidBacteriaNameRegExp);
}

fs.createReadStream("Bacterial_Strains.csv")
  .pipe(csv())
  .on("data", (row) => {
    totalCount++;

    const columnB = row[1];
    const matches = fixTyposAndFindBacteria(columnB);

    // extract bacteria names
    if (!matches) {
      unmatched.push(columnB);
      unmatchedSet.add(columnB);
      return;
    }
    for (name of matches) {
      if (isInvalidBacteriaName(name)) {
        invalid.push(name);
        invalidSet.add(name);
      } else {
        valid.push(name);
        validSet.add(name);
      }
    }
  })
  .on("end", () => {
    // console.log(unmatchedSet);
    // console.log(invalidSet);
    console.log(validSet.size, validSet);

    // Print statistics
    console.log();
    console.log(`input lines: ${totalCount}`);
    console.log(
      `lines with no bacteria: ${unmatched.length} (${Math.round(
        (unmatched.length / totalCount) * 100
      )}%)`
    );
    console.log();
    console.log(`non-unique bacteria names: ${valid.length}`);
    console.log(`unique bacteria names: ${validSet.size}`);
    console.log(`non-unique invalid bacteria names: ${invalid.length}`);

    // write bacteria names to file
    const uniqueNames = Array.from(validSet);
    fs.writeFile(
      "bacteriaNames.txt",
      uniqueNames.sort().join("\n"),
      "utf8",
      () => {}
    );
    fs.writeFile(
      "bacteriaNames.js",
      `module.exports = [\n"` + uniqueNames.sort().join('",\n"') + `"];`,
      "utf8",
      () => {}
    );
  });
