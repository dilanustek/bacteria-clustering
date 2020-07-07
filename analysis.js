const csv = require("csv-parser");
const fixTypos = require("./fixTypos");
const fs = require("fs");
const bacteriaNames = require("./bacteriaNames");
const bacteriaPairCountMap = new Map();
let totalCount = 0;
let unmatchedCount = 0;
let onlyOneCount = 0;
const unmatchedSet = new Set();
const onlyOneSet = new Set();
const isGeneraOnlyMap = true;

function print(linksArray) {
  linksArray.forEach((link) => console.log(link[0], "", link[1]));
}

const bacteriaRegExp = new RegExp(bacteriaNames.join("|"), "g");
const altBacteriaRegExp = /[A-Z][a-z]{3,} ([a-z]{4,}|sp.?)[a-zA-Z0-9_()\/\- \xA0]*(\d\d\d?\.?\d?\d?%)/g;

function fixTyposAndFindBacteria(column) {
  if (!column) {
    return null;
  }
  const fixed = fixTypos(column);

  const matches = fixed.match(altBacteriaRegExp);
  if (!matches) return matches;
  const fullNames = matches.map((match) => {
    const [genus, name] = match.split(" ");
    return genus + " " + name;
  });
  return fullNames.filter(
    (name) => !name.match(/Uncultured|Aquatic|This|Plant|Optimal/)
  );
}

function createLinksAndNodesArray(pairCountArray) {
  // create bacteria links
  const links = pairCountArray.map((entry) => {
    const [source, target] = entry[0].split("---");
    const value = entry[1];
    return { source, target, value };
  });

  // create bacteria nodes
  const nodesSet = new Set();
  links.forEach(({ source, target }) => {
    nodesSet.add(source);
    nodesSet.add(target);
  });
  const nodesArray = Array.from(nodesSet);

  return [links, nodesArray];
}

fs.createReadStream("Bacterial Strains_2020-06-28 01_12_25.csv")
  .pipe(csv())
  .on("data", (row) => {
    totalCount++;
    const matchesB = fixTyposAndFindBacteria(row[1]);
    const matchesC = fixTyposAndFindBacteria(row[2]);
    if (!matchesB && !matchesC) {
      unmatchedCount++;
      unmatchedSet.add(row[1] + "    " + row[2]);
      return;
    }

    let matches = [];
    if (matchesB) {
      matches = matches.concat(matchesB);
    }
    if (matchesC) {
      matches = matches.concat(matchesC);
    }

    const uniqueMatches = Array.from(new Set(matches));
    if (uniqueMatches.length <= 1) {
      onlyOneCount++;
      onlyOneSet.add(row[1] + "    " + row[2]);
      return;
    }

    for (let i = 0; i < uniqueMatches.length; i++) {
      for (let j = i + 1; j < uniqueMatches.length; j++) {
        let a = uniqueMatches[i];
        let b = uniqueMatches[j];
        if (b > a) {
          const temp = a;
          a = b;
          b = temp;
        }
        const key = `${a}---${b}`;
        const currentValue = bacteriaPairCountMap.get(key);
        bacteriaPairCountMap.set(key, (currentValue || 0) + 1);
      }
    }
  })
  .on("end", () => {
    // print statistics
    console.log(`input lines: ${totalCount}`);
    console.log(
      `lines with no matched bacteria: ${unmatchedCount} (${Math.round(
        (unmatchedCount / totalCount) * 100
      )}%)`
    );
    console.log(
      `lines with only one bacteria: ${onlyOneCount} (${Math.round(
        (onlyOneCount / totalCount) * 100
      )}%)`
    );

    // sort by most common link
    const bacteriaPairCountArr = Array.from(bacteriaPairCountMap.entries());
    // console.log(entries);
    const sortedByFrequency = bacteriaPairCountArr.sort((a, b) => b[1] - a[1]);
    // if (!isGeneraOnlyMap) print(sortedByFrequency);

    const sortedAlphabetically = bacteriaPairCountArr.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });
    // if (!isGeneraOnlyMap) print(sortedAlphabetically);

    const [bacteriaLinks, bacteriaNodesArray] = createLinksAndNodesArray(
      bacteriaPairCountArr
    );

    // compute the most common genera
    const generaMap = new Map();
    bacteriaNodesArray.forEach((name) => {
      const genus = name.split(" ")[0];
      generaMap.set(genus, (generaMap.get(genus) || 0) + 1);
    });
    const sortedGenera = Array.from(generaMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    // console.log("Genera: " + sortedGenera.length);
    // print(sortedGenera);
    const mostCommonGenera = sortedGenera.slice(0, 19).map(([genus]) => genus);

    const bacteriaNodes = bacteriaNodesArray.map((name) => {
      const genus = name.split(" ")[0];
      return {
        id: name,
        group: mostCommonGenera.includes(genus) ? genus : 0,
      };
    });

    // generate genera pair count array
    const generaPairCountMap = new Map();

    bacteriaPairCountArr.map((entry) => {
      const [source, target] = entry[0].split("---");
      const sourceGenus = source.split(" ")[0];
      const targetGenus = target.split(" ")[0];
      const key = sourceGenus + "---" + targetGenus;
      const currentValue = generaPairCountMap.get(key);

      generaPairCountMap.set(key, (currentValue || 0) + 1);
    });
    const generaPairCountArr = Array.from(generaPairCountMap.entries());
    if (isGeneraOnlyMap) console.log(generaPairCountArr);

    const [generaLinks, generaNodesArray] = createLinksAndNodesArray(
      generaPairCountArr
    );

    // create nodes by genera
    const generaNodes = generaNodesArray
      .map((name) => {
        return {
          id: name,
          group: mostCommonGenera.includes(name) ? name : 0,
        };
      })
      .filter(({ id, group }) => group !== 0);

    const filteredGeneraLinks = generaLinks.filter(
      ({ source, target }) =>
        mostCommonGenera.includes(source) && mostCommonGenera.includes(target)
    );

    // write to json file
    const json = JSON.stringify({
      nodes: isGeneraOnlyMap ? generaNodes : bacteriaNodes,
      links: isGeneraOnlyMap ? filteredGeneraLinks : bacteriaLinks,
    });

    fs.writeFile("bacteriaPairs.json", json, "utf8", () => {});
  });
