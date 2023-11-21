var domain = `${window.location.origin}/`;
var slug = `/locations`; // list page URL -> also used to manage details view URL
// Google Map 
var map, center, geocoder, autocomplete;
// Auto close info window when another one is opened
var autoCloseInfoWindow = true;
var mapOptions = {
    center: new google.maps.LatLng(-23.3044521, 136.4317195), // default start point (AU Sydney = -33.89035, 150.8444)
    scrollwheel: false,
    draggable: true,
    disableDoubleClickZoom: true,
    zoomControll: true,
    gestureHandling: 'cooperative',
    zoom: 5,
    minZoom: 4,
    maxZoom: 17,
    streetViewControl: true,
    streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
    },
    mapTypeControl: false,
    streetViewControl: false,
    styles: InsitesUtil.getTheme()
}

// Markers
var markers = [], locations = [],
    markerImages = { imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m' };
// API for getting Locations
var filter = {
    page: 1, // page number
    size: 10, // search results per page
    distance: 5, // search radius in KM
    location: {} // location [lng,lat]
}
// Elements
const searchSubmitBtn = document.getElementById('search-submit');
const addressFieldEl = document.getElementById('address-search');
const searchResults = document.getElementById('search-results');
// const searchResultsBtn = document.getElementById('search-results-btn');
const locatorMap = document.getElementById('locator-map');
// Add initMap initializations, functions, binding, etc..
function initMapBinding() {
    insitesLocator.events.initEventListeners();
}

/*** Google Map API Initialization ***/
function initMap() {
    // Initialize Google Map to element <div>
    let mapContainer = document.getElementById('ins-locator-map');

    if(mapContainer){
        map = new google.maps.Map(mapContainer, mapOptions);
        const searchResultsEl = document.createElement("div");
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchResultsEl);
        geocoder = new google.maps.Geocoder();
        addressFieldEl.addEventListener('didLoad', () => {
            var searchField = addressFieldEl.querySelector('input');
            if (searchField) {
                autocomplete = new google.maps.places.Autocomplete(searchField, { types: ['(regions)'] });
                autocomplete.addListener('place_changed', fillAddress);
            } else {
                console.warn('Google Autocomplete initialization failed. Please refresh your browser.');
            }
        });
        //-- Add additional scripts todo after initMap()
        initMapBinding();
    }
}


/*** Google Auto Complete ***/
function fillAddress() {
    let searchResults = autocomplete.getPlace();
    if (!searchResults.formatted_address) return;
    geocodeAddress(searchResults.formatted_address);
}


/*** Update Search Radius ***/
function updateSearchRadius(value){
    filter.distance = value;
}

/*** Google Geocode Lookup - init Search ***/
function geocodeAddress(centerAddress) {
    geocoder.geocode({ 'address': centerAddress }, function (results, status) {
        if (status === 'OK') {
            addressFieldEl.hasError = false;
            addressFieldEl.value = results[0].formatted_address;
            this.filter.location['lat'] = results[0].geometry.location.lat();
            this.filter.location['lng'] = results[0].geometry.location.lng();
            map.setCenter(results[0].geometry.location);
            searchLocations(results[0].formatted_address);
        } else if (!results.length){
            noSearchResultsHandler(centerAddress);
        } else {
            // emit + console warning error
            console.warn("Geocode was not successful for the following reason: ", status)
        }
    });
}

/*** Geo search locations - Axios ***/
async function searchLocations(keyword) {
    this.filter.page == 1 ? insLocatorForm.data.setData('locations', []) : '';
    let response = await InsLocatorServices.searchLocations(this.filter);
    if (response.state && response.data.items) {
        let locations = response.data.items.results;
        if (locations.length) {
            updateMarkers(locations);
            // listLocation(locations);
        } else {
            noSearchResultsHandler(keyword);
        }
    } else {
        console.error("Failed to search for location.", response.data.errors);
    }
}

/*** Loop through results to create map markers & info cards ***/
function updateMarkers(list) {
    insLocatorForm.data.pushArrayData('locations', list);

    markers = [];
    resultsList.innerHTML = " ";
    
    for (var i = 0; i < list.length; i++) {
        var infowindow = new google.maps.InfoWindow();
        
        var icon = {
            url: `${Object.keys(list[i].properties.pin_icon).length ? list[i].pin_icon.url : ''}`, // url
            scaledSize: new google.maps.Size(37, 37), // size
        };

        var marker = new google.maps.Marker({
            position: {
                lng: list[i].properties.geojson.coordinates[0],
                lat: list[i].properties.geojson.coordinates[1]
            }
        });
        if(Object.keys(list[i].properties.pin_icon).length) marker.setIcon(icon);

        listLocation(list[i], i);
        makeInfoWindowEvent(map, infowindow, list[i], marker);
        markers.push(marker); // Set Cluster Markers, OR ...
        // marker.setMap(map); // Set Marker w/o Clustering
    }

    // Scroll to map
    window.location.hash = "";
    window.location.hash = "search-results";

    map.streetViewControl = false;
    map.setZoom(14);

    // Add MarkerClusters to map.
    let markerCluster = new MarkerClusterer(map, this.markers, markerImages);
    let styles = markerCluster.getStyles();
    for (let i=0; i<styles.length; i++) {
        styles[i].textColor = "white";
    }
}


/*** List search results to drawer ***/
function listLocation(location, index) {
    resultsList.style.display = "block";
    // Google = [Lat, Log], pOS = [Long, Lat]
    let lat = location.properties.geojson.coordinates[1];
    let long = location.properties.geojson.coordinates[0];
    let location_name = location.properties.location_name;
    let link = location.properties.slug ? `${slug}/${location.properties.slug}` : false;
    let distance = calculateDistance(location.properties);

    let item = document.createElement('li');
        item.innerHTML = `
            <div class='location-content-wrapper'>
                <img class="location-image" width="80" height="80" src="${location.location_image.url 
                    ? location.location_image.url 
                    : `${domain}assets/modules/locator/images/default.png`}"
                    alt="${location.properties.location_name}"
                    title="${location.properties.location_name}" />
                <div class='location-details'>
                    <div class="upper-row">
                        <div>
                            ${link ? `<a href='${link}' target='_blank'>` : ''}
                                <h3><span class='location-name'>${location_name}</span></h3>
                            ${link ? `</a>` : ''}
                            <div class="spacer xx-small"></div>
                            <p class="location-sub-texts">
                                ${constructAddress(location.properties)}
                            </p>
                        </div>
                        <div class='buttons'>
                            <ins-button outlined 
                                label='Enquire'
                                size='normal'
                                icon='icon-email-1'
                                id='enquire-${location.id}' 
                                data-id='${location.id}'
                                data-location_name="${location.properties.location_name}"
                                onclick="insLocatorForm.methods.showEnquiryForm('${location.properties.uuid}', \`${location.properties.location_name}\`)">
                            </ins-button>
                            ${link ? `<ins-button solid
                                icon='icon-eye'
                                size='normal' label='More Information'
                                onclick='window.open("${link}", "_blank");'>
                            </ins-button>`  : '' }
                        </div>
                    </div>
                    <div class="lower-row">
                        ${ location.properties.phone_number || location.properties.email ?
                            `<div class="sub-details">
                                <p class="location-sub-texts bolder">
                                    Contact Details
                                </p>
                                ${ location.properties.phone_number ?
                                        `<p class="location-sub-texts">
                                            (${location.properties.phone_country_code}) ${location.properties.phone_number}
                                        </p>` : ''}
                                ${ location.properties.email ?
                                    `<p class="location-sub-texts">
                                        ${location.properties.email}
                                    </p>` : ''}
                            </div>` : ''}
                        ${ location.system_fields.length ?
                            `<div class="sub-details">
                                <p class="location-sub-texts bolder">
                                    ${location.system_field_name}
                                </p>
                                <p class="location-sub-texts">
                                    ${getFields(location.system_fields)}
                                </p>
                        </div>` : ''}
                        <div class="sub-details">
                            <p class="location-sub-texts bolder">
                                Store Availability
                            </p>
                            ${constructSchedule(location.properties)}
                        </div>
                    </div>
                    <div class="grid-view-buttons">
                        <div class='buttons'>
                            <ins-button outlined 
                                label='Enquire'
                                size='normal'
                                icon='icon-email-1'
                                id='enquire-${location.id}' 
                                data-id='${location.id}'
                                data-location_name="${location.properties.location_name}"
                                onclick="insLocatorForm.methods.showEnquiryForm('${location.properties.uuid}', \`${location.properties.location_name}\`)">
                            </ins-button>
                            ${link ? `<ins-button solid
                                icon='icon-eye'
                                size='normal' label='More Information'
                                onclick='window.open("${link}", "_blank");'>
                            </ins-button>`  : '' }
                        </div>
                    </div>
                </div>
            </div>`;
    resultsList.appendChild(item);
    resultsLoader.style.display = "none";
}

/***
 * Return System Field Values
 ***/
function getFields(fields) {
    let system_fields = "";
    fields.forEach((field, index) => system_fields += `${(fields.length > 1 && index === fields.length - 1) ? ' and ' : ''}${field.properties.value}${(index === fields.length - 1 || index === fields.length - 2) ? '' : ', '}`);

    return system_fields;
}

/**
 * Function when 'See on Map' is clicked.
 * - Close drawer
 * - Pan the map to the location marker
 */
function directionsBtnEventHandler(index, element) {
    google.maps.event.trigger(markers[index], 'click');
}

/***
 * Search results placeholder image / html content
 ***/
function placeholderImage() {
    return `
        <div class="placeholder-img vertical-align-middle">
            <i class="medium icon-panorame"></i>
        </div>`;
}


/*** Concat address string ***/
function constructAddress(data) {
    let address = "";
        address += data.address_1 || '';
        address += data.address_2 ? ` ${data.address_2.trim()}` : '';
        address += data.address_3 ? ` ${data.address_3.trim()}` : '';
        address += data.city ? ` ${data.city.trim()}` : '';
        address += data.district ? ` ${data.district.trim()}` : '';
        address += data.county ? ` ${data.county.trim()}` : '';
        address += data.state ? ` ${data.state.trim()}` : '';
        address += data.country ? ` ${data.country.trim()}` : '';
        address += data.post_code ? ` ${data.post_code.trim()}` : '';
    return address;
}

/*** Create opening hours html elements ***/
function constructSchedule(data) {
    let dateNow = new Date();
    let daysUsed = ['sunday', 'monday','tuesday','wednesday','thursday','friday','saturday'];
    let getDay = dateNow.getDay();
    let currentDay = daysUsed[getDay];
    let accordionHeading = constructAccordionHeading("is_open_on_"+data[daysUsed[getDay]], data[daysUsed[getDay]+"_opening_time"], data[daysUsed[getDay]+"_closing_time"]);

    return `
        <ins-accordion>
            <ins-accordion-item
                class="store-availability-wrapper"
                heading="${accordionHeading}">
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 0 ? ` bolder` : ``}">Sunday</span>
                    <span class="location-sub-texts${getDay == 0 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_sunday, data.sunday_opening_time, data.sunday_closing_time)}</span>
                </div>
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 1 ? ` bolder` : ``}">Monday</span>
                    <span class="location-sub-texts${getDay == 1 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_monday, data.monday_opening_time, data.monday_closing_time)}</span>
                </div>
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 2 ? ` bolder` : ``}">Tuesday</span>
                    <span class="location-sub-texts${getDay == 2 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_tuesday, data.tuesday_opening_time, data.tuesday_closing_time)}</span>
                </div>
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 3 ? ` bolder` : ``}">Wednesday</span>
                    <span class="location-sub-texts${getDay == 3 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_wednesday, data.wednesday_opening_time, data.wednesday_closing_time)}</span>
                </div>
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 4 ? ` bolder` : ``}">Thursday</span>
                    <span class="location-sub-texts${getDay == 4 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_thursday, data.thursday_opening_time, data.thursday_closing_time)}</span>
                </div>
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 5 ? ` bolder` : ``}">Friday</span>
                    <span class="location-sub-texts${getDay == 5 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_friday, data.friday_opening_time, data.friday_closing_time)}</span>
                </div>
                <div class="time-sched-wrapper">
                    <span class="location-sub-texts${getDay == 6 ? ` bolder` : ``}">Saturday</span>
                    <span class="location-sub-texts${getDay == 6 ? ` bolder` : ``}">${constructDaySchedule(data.is_open_on_saturday, data.saturday_opening_time, data.saturday_closing_time)}</span>
                </div>
            </ins-accordion-item>
        </ins-accordion>`;
}

/*** Concat day schedule string ***/
function constructDaySchedule(enabled, open, close) {
    return `${enabled ? `${!open && !close ? "Open" : `${open ? open : 'n/a'} - ${close ? close : 'n/a'}`}` : "Closed"}`
}

/*** Concat string for heading ***/
function constructAccordionHeading(enabled, open, close) {
    let date = new Date();
    var day = '' + date.getDay();
    var hhmm = ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);

    let days = ['1', '2','3','4','5','6','7'];

    if(enabled && open && close) {
        var openTime = convertToMilitaryTime(open);
        var closeTime = convertToMilitaryTime(close);
        return days.indexOf(day) >= 0 && openTime <= hhmm && hhmm < closeTime ? "Open" : "Closed";
    }else {
        return "Closed";
    }

    // return `${enabled ? `${!open && !close ? "Open" : `Open ${open ? open : 'n/a'} - ${close ? close : 'n/a'}`}` : "Closed"}`
}


/*** Convert 24 hour format to 12 hour (AM/PM) ***/
/*** this would be deprected since the time for the locator is only on the 12 hour format ***/
function convertTime(time) {
    let hourEnd = time.indexOf(":");
    let H = +time.substr(0, hourEnd);
    let h = H % 12 || 12;
    let ampm = (H < 12 || H === 24) ? " AM" : " PM";
    time = h + time.substr(hourEnd, 3) + ampm;
    return time;
}

/*** Convert 12 hour (AM/PM) to 24 hour format ***/
function convertToMilitaryTime(time12h) {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if(parseInt(hours, 10) < 12) {
        hours = `0${hours}`
    }else if (hours === '12') {
        hours = '00';
    }
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    return `${hours}:${minutes}`;
}

/*** Calculate distance  ***/
function calculateDistance(loc){
    let distance = 0;
    if(loc && loc.geojson) {
        let from = new google.maps.LatLng(
            filter.location.lat,
            filter.location.lng);
        let to = new google.maps.LatLng(
            loc.geojson.coordinates[1],
            loc.geojson.coordinates[0])
        let res = google.maps.geometry.spherical
            .computeDistanceBetween(from, to);
        distance = (res / 1000).toFixed(2);
    }
    return distance;
}


/*** Create Information Card ***/
let prevWindow = false;
function makeInfoWindowEvent(map, infowindow, data, marker) {
    let link = data.properties.slug ? `${slug}/${data.properties.slug}` : false;
    let category = data.category
        ? data.category.name
        : "";

    var content = `
        <div class="map-info-card-wrapper">
            <div class="image-wrapper">
                ${link ? `<a href='${link}' target='_blank'>` : ''}
                    <img class="location-image" width="80" height="80" src="${data.location_image.url 
                        ? data.location_image.url 
                        : `${domain}assets/modules/locator/images/default.png`}"
                        alt="${data.properties.location_name}"
                        title="${data.properties.location_name}" />
                ${link ? `</a>` : ''}
            </div>
            <div class='spacer'></div>
            <div class="location-details">
                ${link ? `<a href='${link}' target='_blank'>` : ''}
                    <span class='location-name'>${data.properties.location_name}</span>
                ${link ? `</a>` : ''}
                <div class="spacer xx-small"></div>
                <p class="location-sub-texts">
                    ${constructAddress(data.properties)}
                </p>
                <div class='spacer'></div>
                <div class="link-buttons">
                    <ins-button outlined 
                        label='Enquire'
                        size='normal'
                        id='enquire-${data.id}' 
                        data-id='${data.id}'
                        data-location_name="${data.properties.location_name}"
                        onclick="insLocatorForm.methods.showEnquiryForm('${data.properties.uuid}', \`${data.properties.location_name}\`)">
                    </ins-button>
                    ${link ? `<div class='spacer small'></div>
                        <ins-button  solid
                        size='normal' label='View Location'
                        onclick='window.open("${link}", "_blank");'>
                    </ins-button>`  : '' }
                </div>
                
            </div>
        </div>
    `;
    google.maps.event.addListener(marker, 'click', function () {
        // auto close prev marker info card
        if(prevWindow && autoCloseInfoWindow) {
            prevWindow.close();
        }
        // pan & zoom to marker [lat, long]
        panMaptoMarker(data.properties.geojson.coordinates[1], data.properties.geojson.coordinates[0]);
        // set marker & info card content
        infowindow.setContent(content);
        infowindow.open(map, marker);
        prevWindow = infowindow;
    });
    google.maps.event.addListener(map, "click", function(event) {
        infowindow.close();
    });
}

/*** Create opening hours html elements ***/
function constructCardSchedule(data) {
    let dateNow = new Date();
    let daysUsed = ['sunday', 'monday','tuesday','wednesday','thursday','friday','saturday'];
    let getDay = dateNow.getDay();
    let accordionHeading = constructAccordionHeading("is_open_on_"+data[daysUsed[getDay]], data[daysUsed[getDay]+"_opening_time"], data[daysUsed[getDay]+"_closing_time"]);
    return `${accordionHeading}`;
}


/**
 * No search results
 */
function noSearchResultsHandler(keyword) {
    locatorMap.classList.remove('show-results');
    locatorMap.classList.remove('hide-results');
    locatorMap.classList.remove("large-6");
    locatorMap.classList.remove("medium-6");
    locatorMap.classList.add("large-12");
    locatorMap.classList.add("medium-12");
    resultsList.style.display = "none";
    resultsLoader.style.display = "none";

    new MarkerClusterer(map, [], markerImages);
    App.events.swal('OK', `No search results for ${keyword}.`, "");
}

/** Pan Map to marker */
function panMaptoMarker(lat, long) {
    // Google = [Lat, Log], pOS = [Long, Lat]
    let coordinates = new google.maps.LatLng(lat, long);
    map.panTo(coordinates);
    map.setZoom(17);
}

window.onload = initMap();