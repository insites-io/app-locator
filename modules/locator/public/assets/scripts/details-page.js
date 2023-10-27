// Div element to set Google Map display
const mapEl = document.getElementById('location-google-map');
// default map center (Sydney, Australia)
const defaultCenter = new google.maps.LatLng(-33.8671868, 151.2049769);
// Map center address
let address = document.getElementById('full-address').innerText;
// GeoJSON feature not yet supported on INS global contents / data
let geoJSON = document.getElementById('geo-json');
geoJSON = geoJSON && geoJSON.innerText? JSON.parse(geoJSON.innerText) : undefined;
// GeoJSON area indicator styling on map
let polyOptions = {
    strokeColor: "#1E86E3",
    fillColor: "#1E86E3",
    strokeOpacity: 1,
    strokeWeight: 3,
    fillOpacity: 0.35
}
/**
 * To change or apply your own map style, simply change the value of 
 * variable 'mapStyle' below to your prefered JSON styling.
 * 
 * References:
 * Google Detailed Guide: https://developers.google.com/maps/documentation/javascript/styling
 * Google map template styles: https://snazzymaps.com/ (or get from designer / PM)
 * */
let mapStyle = InsitesUtil.getTheme();

/** 
 * Locations details page - Scripts / Functions
 * */
let Locations = (function () {
    return {
        methods: {
            /** 
             * Set or customize other properties and functionalities of Google Map
             * */
            initGoogleMap() {
                let geocoder = new google.maps.Geocoder();
                let map = new google.maps.Map(mapEl, {
                    center: defaultCenter,
                    scrollwheel: false,
                    draggable: true,
                    disableDoubleClickZoom: true,
                    zoomControll: false,
                    streetViewControl: false,
                    gestureHandling: 'cooperative',
                    zoom: 15,
                    styles: mapStyle
                });

                if (geoJSON) {
                    this.constructMarker(map);
                } else {
                    this.directionsURL = `https://www.google.com/maps/search/${address.fullAddress}`;
                    this.mapGetCoordinates(geocoder, map);
                }
            },
            mapGetCoordinates(geocoder, map) {
                if (address.trim() !== '') {
                    geocoder.geocode({ 'address': address },
                        (results, status) => {
                            if (status === 'OK') {
                                map.setCenter(results[0].geometry.location);
                                let marker = new google.maps.Marker({
                                    map,
                                    position: results[0].geometry.location
                                });
                            } else {
                                console.error('Geocode was not successful for the following reason: ' + status);
                            }
                        });
                }
            },
            constructMarker(map) {
                let center, type = geoJSON.type.toLowerCase();
                polyOptions.map = map;

                if (type === "point") {
                    this.newMarker(geoJSON.coordinates, map);
                    center = this.mapLngLat(geoJSON.coordinates);

                } else if (type === "multipoint") {
                    geoJSON.coordinates.forEach(item => this.newMarker(item, map));
                    center = {
                        lng: geoJSON.coordinates[0][0],
                        lat: geoJSON.coordinates[0][1]
                    }

                    if (geoJSON.coordinates.length > 1)
                        this.setMapBounds(map, geoJSON.coordinates);

                } else if (type === "linestring") {
                    center = this.mapLngLat(geoJSON.coordinates[0]);
                    polyOptions.path = geoJSON.coordinates.map(this.mapLngLat)
                    new google.maps.Polyline(polyOptions);

                } else if (type === "polygon") {
                    center = this.mapLngLat(geoJSON.coordinates[0][0]);
                    polyOptions.paths = geoJSON.coordinates[0].map(this.mapLngLat)
                    new google.maps.Polygon(polyOptions);
                }

                map.setCenter(center);
            },
            newMarker(lnglat, map) {
                let position = this.mapLngLat(lnglat);
                let marker = new google.maps.Marker({ map, position })
                let infowindow = new google.maps.InfoWindow();
                google.maps.event.addListener(marker, "click", () => {
                    infowindow.setContent(this.constructContent(position));
                    infowindow.open(map, marker);
                });
                return marker;
            },
            mapLngLat(lnglat) {
                return { lng: lnglat[0], lat: lnglat[1] }
            },
            setMapBounds(map, markers) {
                let latlngbounds = new google.maps.LatLngBounds();
                markers.forEach(item => {
                    let latlng = new google.maps.LatLng(item[1], item[0]);
                    latlngbounds.extend(latlng);
                });
                map.fitBounds(latlngbounds);
            }
        }
    }
})();

// Initialize javascript and Google map on load
window.Locations = Locations;
Locations.methods.initGoogleMap();