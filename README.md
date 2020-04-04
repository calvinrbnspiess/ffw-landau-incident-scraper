This project is used to fetch historical incidents of the fire department in Landau, Rhineland-Palatinate, Germany. The data will be stored in `data/incidents-details/[incident_number].json`.

Create a .env file with an environment variable named `GOOGLE_MAPS_API_KEY` that provides a valid Google Maps API key that is enabled for [Geocoding](https://developers.google.com/maps/documentation/geocoding/).

## Utilized API

https://www.feuerwehr-landau.de/mobile/einsaetze
https://www.feuerwehr-landau.de/mobile/einsaetze?idStart=0&idEnd=15
https://www.feuerwehr-landau.de/mobile/einsatzDetails.php?id=6028

## mobile/einsatzDetails contains additional information like amountPeople and vehicles, but not the data given by mobile/einsaetze
