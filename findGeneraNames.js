const csv = require("csv-parser");
const fs = require("fs");
const fixTypos = require("./fixTypos");
const valid = [];
const invalid = [];
const unmatched = [];
const invalidSet = new Set();
const unmatchedSet = new Set();
const validSet = new Set();
let totalCount = 0;

function isInvalidGenusName(name) {
  return !!name.match(
    /Fungi|Ammonia|Plant|Marine|Alkaline|Humic|Possible|Posible|Pathogen|Animal|Human|Desert|Uncultured|Cause|Sequence|Opportunistic|Biodegredan|Unidentified|Produce|Denitrifying|Pesticide|Nitrogen|Potential|Herbicide|Agricultural|Biocide|Costal|Corrosion|Excessive|Mouth|Biodegredation|Protein|Mushroom|Biodegrade|Antifungal|Radiation|Dispose|Cheese|Sulfur|Hydrocarbon|Clinical|Fixing|Hormone|Hasan|Karasu|Stress|Acetic|Levan|Halophile/
  );
}

fs.createReadStream("Bacterial_Strains.csv")
  .pipe(csv())
  .on("data", (row) => {
    totalCount++;

    let columnB = row[1];
    if (!columnB) return;

    // correct typos
    columnB = fixTypos(columnB);

    // extract bacteria names
    const matches = columnB.match(/[A-Z][a-z]{4,} ([a-z]{4,}|sp)/g);
    if (!matches) {
      unmatched.push(columnB);
      unmatchedSet.add(columnB);
      return;
    }

    // extra generact names from bacteria names
    for (bacteriaName of matches) {
      const genus = bacteriaName.split(" ")[0];
      if (isInvalidGenusName(genus)) {
        invalid.push(bacteriaName);
        invalidSet.add(bacteriaName);
      } else {
        valid.push(genus);
        validSet.add(genus);
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
    console.log(`non-unique genera names: ${valid.length}`);
    console.log(`unique genera names: ${validSet.size}`);
    console.log(`non-unique invalid genera names: ${invalid.length}`);

    // write genera names to file
    const uniqueNames = Array.from(validSet);
    fs.writeFile(
      "generaNames.txt",
      uniqueNames.sort().join("\n"),
      "utf8",
      () => {}
    );
    fs.writeFile(
      "generaNames.js",
      `module.exports = [\n"` + uniqueNames.sort().join('",\n"') + `"];`,
      "utf8",
      () => {}
    );
  });
