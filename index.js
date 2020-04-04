import fetch from "node-fetch";
import querystring from "querystring";
import { URL } from "url";
import parser from "xml2js";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import dotenv from "dotenv";
import fns from "date-fns";

console.log(`
███████╗██╗    ██╗    ██╗      █████╗ ███╗   ██╗██████╗  █████╗ ██╗   ██╗    ███████╗██╗███╗   ██╗███████╗ █████╗ ███████╗████████╗███████╗███████╗
██╔════╝██║    ██║    ██║     ██╔══██╗████╗  ██║██╔══██╗██╔══██╗██║   ██║    ██╔════╝██║████╗  ██║██╔════╝██╔══██╗██╔════╝╚══██╔══╝╚══███╔╝██╔════╝
█████╗  ██║ █╗ ██║    ██║     ███████║██╔██╗ ██║██║  ██║███████║██║   ██║    █████╗  ██║██╔██╗ ██║███████╗███████║█████╗     ██║     ███╔╝ █████╗  
██╔══╝  ██║███╗██║    ██║     ██╔══██║██║╚██╗██║██║  ██║██╔══██║██║   ██║    ██╔══╝  ██║██║╚██╗██║╚════██║██╔══██║██╔══╝     ██║    ███╔╝  ██╔══╝  
██║     ╚███╔███╔╝    ███████╗██║  ██║██║ ╚████║██████╔╝██║  ██║╚██████╔╝    ███████╗██║██║ ╚████║███████║██║  ██║███████╗   ██║   ███████╗███████╗
╚═╝      ╚══╝╚══╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝     ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚══════╝
                                                           === Rohdaten-Parser ===                                                                                                                                              
`);

console.log("initialising ...");

dotenv.config();

if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.log(
    "(!) Warning: There is no GOOGLE_MAPS_API_KEY defined in .env file. Incidents won't be geocoded.\n"
  );
}

if (!process.env.METEOSTAT_API_KEY) {
  console.log(
    "(!) Warning: There is no METEOSTAT_API_KEY defined in .env file. Incidents won't get historical weather data.\n"
  );
}

mkdirSync("data/raw/", { recursive: true });
mkdirSync("data/incidents/", { recursive: true });
mkdirSync("data/incidents-details/", { recursive: true });

// used to delay requests in order to not overwhelm the server
const sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

// create a valid sync state or populate it with default data
const generateSyncState = (
  lastRequest = "-",
  lastResponseFile = "-",
  idStart = 0,
  idEnd = 0,
  idDetails = 0
) => {
  return {
    date: new Date().toJSON(),
    lastRequest,
    lastResponseFile,
    idStart,
    idEnd,
    idDetails
  };
};

const SYNC_FILE = "data/sync.json";

const writeSyncState = syncState => {
  writeFileSync(SYNC_FILE, JSON.stringify(syncState, null, 2));
};

// returns content of sync file OR generates a new one with placeholder data if not readable
const readSyncState = () => {
  let syncState;
  try {
    syncState = JSON.parse(readFileSync(SYNC_FILE));
  } catch (e) {
    console.log("Could not read sync file: " + e);
    syncState = generateSyncState();
    writeSyncState(syncState);
  }
  return syncState;
};

const parseXMLtoJSON = xml =>
  new Promise(resolve => {
    parser.parseString(xml, { explicitArray: false }, (err, parsed) =>
      resolve(parsed)
    );
  });

// request a range of incidents (not their details)
const getIncidents = async (idStart, idEnd) => {
  let params = {};

  if (idStart !== undefined) {
    params = { ...params, idStart };
  }

  if (idEnd !== undefined) {
    params = { ...params, idEnd };
  }

  const url = new URL("https://www.feuerwehr-landau.de/mobile/einsaetze");

  url.search = querystring.stringify(params);

  const parsed = url.toString();

  console.log(parsed);
  return fetch(parsed);
};

const getIncidentDetails = id => {
  const url = new URL(
    "https://www.feuerwehr-landau.de/mobile/einsatzDetails.php"
  );
  url.search = querystring.stringify({ id: id });

  const parsed = url.toString();

  console.log(parsed);
  return fetch(parsed);
};

const getGeocodeInformation = place => {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");

  url.search = querystring.stringify({
    address: `${place}, Landau`,
    key: process.env.GOOGLE_MAPS_API_KEY
  });

  const parsed = url.toString();

  console.log(parsed);
  return fetch(parsed);
};

const getWeatherInformation = dateString => {
  const url = new URL("https://api.meteostat.net/v1/history/daily");

  const dateFormatted = fns.format(new Date(dateString), "yyyy-MM-dd");

  // The weather station has the id=10724 and is in Weinbiet (Neustadt, Weinstraße). It is on a height of 553m above NN.
  // Alternative would be station D0377 in Bad Bergzabern (would be closer to elevation in Landau), but there is less data available.

  url.search = querystring.stringify({
    station: "10724",
    start: dateFormatted,
    end: dateFormatted,
    key: process.env.METEOSTAT_API_KEY
  });

  const parsed = url.toString();

  console.log(parsed);
  return fetch(parsed);
};

// saves raw request result with current timestamp, pathname as an api-call indicator and the used search query
const saveRequest = res =>
  new Promise((resolve, reject) => {
    res
      .clone()
      .text()
      .then(text => {
        const url = new URL(res.url);
        const filename = `data/raw/${Date.now()}-${url.pathname
          .split("/")
          .pop()}-${url.search !== "" ? url.search : "none"}.xml`;
        writeFileSync(filename, text);
        resolve(Object.assign(res, { responseFile: filename }));
      });
  });

const synchronizeAllIncidents = async () => {
  let newestIncidentId;
  let syncState = readSyncState();

  // step 1 - handshake
  const parsedHandshake = await getIncidents()
    .then(saveRequest)
    .then(res => {
      syncState = generateSyncState(
        res.url,
        res.responseFile,
        syncState.idStart,
        syncState.idEnd,
        syncState.idDetails
      );
      writeSyncState(syncState);

      return res;
    })
    .then(res => res.text())
    .then(parseXMLtoJSON);

  const incidents = parsedHandshake["Einsaetze"]["Einsatz"];
  const newestIncident = incidents[0];
  newestIncidentId = parseInt(newestIncident["general:einsatzid"]);
  console.log(
    `Last incident was at ${newestIncident["general:dateFormatted"]} with title '${newestIncident["general:title"]}'. [id=${newestIncidentId}]`
  );

  // step 2 - resume work

  // fetch batch
  // for each single
  //  - fetch single
  //  - fetch geocode location
  //  - aggregate (create json file with merged data)

  while (syncState.idEnd < newestIncidentId) {
    // now we should have a batch available
    let batchIdStart, batchIdEnd;
    if (syncState.idDetails < syncState.idEnd) {
      console.log("Still incidents left in this batch to process.");
      batchIdStart = syncState.idStart;
      batchIdEnd = syncState.idEnd;
    } else {
      console.log("Start fetching a new batch.");
      batchIdStart = syncState.idEnd + 1;
      batchIdEnd = batchIdStart + 19;
    }

    const parsed = await getIncidents(batchIdStart, batchIdEnd)
      .then(saveRequest)
      .then(res => {
        syncState = generateSyncState(
          res.url,
          res.responseFile,
          batchIdStart,
          batchIdEnd,
          syncState.idDetails
        );
        writeSyncState(syncState);

        return res;
      })
      .then(res => res.text())
      .then(parseXMLtoJSON);

    const incidentsBatch = parsed["Einsaetze"]["Einsatz"];

    if (incidentsBatch === undefined) {
      console.log("(!) Warning: This batch is empty. It will be skipped.");
      syncState.idDetails = syncState.idEnd;
      await sleep(20 * 1000);
      continue;
    }

    const filename = `data/incidents/${batchIdStart}-${batchIdEnd}.json`;
    writeFileSync(filename, JSON.stringify(incidentsBatch, null, 2));

    console.log("Iterating the batch.");
    for (
      let nextToSync = syncState.idDetails + 1;
      nextToSync <= batchIdEnd;
      nextToSync++
    ) {
      const generalIncidentInformation = incidentsBatch.find(
        incident => parseInt(incident["general:einsatzid"]) === nextToSync
      );

      if (generalIncidentInformation === undefined) {
        console.log(
          `(!) Warning: There is no general information for this incident [id=${nextToSync}]. Skipping.`
        );
        continue;
      }

      let details = await getIncidentDetails(nextToSync)
        .then(saveRequest)
        .then(res => {
          syncState = generateSyncState(
            res.url,
            res.responseFile,
            batchIdStart,
            batchIdEnd,
            nextToSync
          );
          writeSyncState(syncState);
          return res;
        })
        .then(res => res.text())
        .then(parseXMLtoJSON);

      let incidentPlace = generalIncidentInformation["general:location"];
      let incidentCoordinates = undefined;
      if (
        process.env.GOOGLE_MAPS_API_KEY &&
        incidentPlace !== undefined &&
        incidentPlace !== ""
      ) {
        let request = await getGeocodeInformation(incidentPlace).then(res =>
          res.json()
        );

        let results = request["results"];

        if (request["results"].length === 0) {
          console.log(
            "Could not find geographical coordinates for this incident."
          );
        } else {
          incidentCoordinates = results[0]["geometry"]["location"];
        }
      }

      let historicalWeather = undefined;
      if (
        process.env.METEOSTAT_API_KEY &&
        generalIncidentInformation["general:date"] !== undefined
      ) {
        let request = await getWeatherInformation(
          generalIncidentInformation["general:date"]
        ).then(res => res.json());

        let data = request["data"];

        if (data.length === 0) {
          console.log("Could not find weather information for this incident.");
        } else {
          historicalWeather = data[0];
        }
      }

      const {
        $: headerDetails,
        "general:einsatzid": einsatzid,
        ...filteredDetails
      } = details["Einsatz"];

      const {
        $: headerGeneral,
        ...filteredGeneral
      } = generalIncidentInformation;

      if (einsatzid !== filteredGeneral["general:einsatzid"]) {
        console.log(
          `(!) Warning: The incident id provided by details [id=${einsatzid}] is not the same as in the general information [id=${filteredGeneral["general:einsatzid"]}]. There may be an error.`
        );
      }

      const populated = {
        ...filteredGeneral,
        ...filteredDetails,
        "meta:geolocation": incidentCoordinates,
        "meta:weather": historicalWeather
      };

      writeFileSync(
        `data/incidents-details/${nextToSync}.json`,
        JSON.stringify(populated, null, 2)
      );
      await sleep(5 * 1000);
    }
    console.log("Batch done.");
    await sleep(20 * 1000);
  }
  console.log("Sync done.");
};

synchronizeAllIncidents();
