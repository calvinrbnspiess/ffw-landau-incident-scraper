This project is used to fetch historical incidents of the fire department in Landau, Rhineland-Palatinate, Germany. The data will be stored in `data/incidents-details/[incident_number].json`.

Create a .env file with an environment variable named `GOOGLE_MAPS_API_KEY` that provides a valid Google Maps API key that is enabled for [Geocoding](https://developers.google.com/maps/documentation/geocoding/). To fetch historical weather data for the day of an incident, provide a Meteostat API key with the key `METEOSTAT_API_KEY`.

## Utilized API

https://www.feuerwehr-landau.de/mobile/einsaetze
https://www.feuerwehr-landau.de/mobile/einsaetze?idStart=0&idEnd=15
https://www.feuerwehr-landau.de/mobile/einsatzDetails.php?id=6028

mobile/einsatzDetails contains additional information like amountPeople and vehicles, but not the data given by mobile/einsaetze

## Historical Weather Data

Data provided by [meteostat](https://www.meteostat.net "meteostat"). Meteorological data: Copyright © National Oceanic and Atmospheric Administration (NOAA), Deutscher Wetterdienst (DWD). Learn more about the [sources](https://www.meteostat.net/sources "meteostat Sources").
