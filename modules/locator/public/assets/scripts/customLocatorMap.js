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
const resultsList = document.getElementById('results-list');
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
        toggleSearchResults(searchResultsEl, map);
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


/*** Create custom button in Google Map ***/
function toggleSearchResults(map) {
    const btnSearchEl = document.createElement("div");
    btnSearchEl.classList.add('btn-search-results');
    btnSearchEl.style.backgroundColor = "#fff";
    btnSearchEl.style.border = "none";
    btnSearchEl.style.borderRadius = "2px";
    btnSearchEl.style.boxShadow = "rgb(0 0 0 / 30%) 0px 1px 4px -1px";
    btnSearchEl.style.cursor = "pointer";
    btnSearchEl.style.marginLeft = "24px";
    btnSearchEl.style.marginTop = "24px";
    btnSearchEl.style.marginBottom = "0px";
    btnSearchEl.style.textAlign = "center";
    map.appendChild(btnSearchEl);
  
    const textSearchEl = document.createElement("div");
    textSearchEl.style.color = "rgb(102, 102, 102)";
    textSearchEl.style.lineHeight = "15px";
    textSearchEl.style.fontSize = "12px";
    textSearchEl.style.fontWeight = "700";
    textSearchEl.style.fontFamily = "'Cabin', sans-serif";
    textSearchEl.style.padding = "14px";
    textSearchEl.innerHTML = '<span class="icon-chevron-right"></span><span style="margin-left:6px;" class="text-cont">Hide List</span>';
    btnSearchEl.appendChild(textSearchEl);
  
    btnSearchEl.addEventListener("click", () => {
        toggleSearchResultsList();
    });
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
        var marker = new google.maps.Marker({
            position: {
                lng: list[i].properties.geojson.coordinates[0],
                lat: list[i].properties.geojson.coordinates[1]
            }
        });
        listLocation(list[i], i);
        makeInfoWindowEvent(map, infowindow, list[i], marker);
        markers.push(marker); // Set Cluster Markers, OR ...
        // marker.setMap(map); // Set Marker w/o Clustering
    }

    // Scroll to map
    window.location.hash = "";
    window.location.hash = "search-results";

    toggleSearchResultsList(true); // open drawer
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
    // Google = [Lat, Log], pOS = [Long, Lat]
    let lat = location.properties.geojson.coordinates[1];
    let long = location.properties.geojson.coordinates[0];
    let location_name = location.properties.location_name;
    let link = location.properties.slug ? `${slug}/${location.properties.slug}` : false;
    let distance = calculateDistance(location.properties);

    let item = document.createElement('li');
        item.innerHTML = `
            <div class='result'>
                <div class='results-content-wrap'>
                    ${link ? `<a href='${link}' target='_blank'>` : ''}
                        <h3><span class='location-name'>${location_name}</span></h3>
                    ${link ? `</a>` : ''}
                    <div class='spacer small'></div>
                    <div class="short-description">
                        ${location.properties.short_description}
                    </div>
                    <div class='spacer small'></div>
                    <p class="location-p">
                        <i class="icon-map location-icon"></i>
                        <span class="detail-label">${constructAddress(location.properties)}</span>
                    </p>
                    <div class='spacer x-small'></div>
                    <div>
                        ${constructSchedule(location.properties)}
                    </div>
                    <div class='spacer x-small'></div>
                    <p class="location-p">
                        <i class="icon-location-arrow location-icon"></i>
                        <span class="detail-label">${distance} KM</span>
                    </p>
                    <div class='spacer small'></div>
                    <div class="links">
                        <ins-button outlined 
                            label='Enquire'
                            size='normal'
                            class='enquireLocationBtn'
                            id='enquire-${location.id}' 
                            data-id='${location.id}'
                            data-location_name="${location.properties.location_name}"
                            onclick="insLocatorForm.methods.showEnquiryForm('${location.properties.uuid}', \`${location.properties.location_name}\`)">
                        </ins-button>
                        ${link ? `<ins-button solid
                            size='normal' label='View Location'
                            onclick='window.open("${link}", "_blank");'>
                        </ins-button>`  : '' }
                    </div>
                </div>
            </div>`;
    resultsList.appendChild(item);
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
 Show and hide search results 
  - Open search results, Update show and hide button icon for results when toggling
***/
function toggleSearchResultsList(value) {
    let btn = locatorMap.querySelector('.btn-search-results span');
    let innerBtn = locatorMap.querySelectorAll('.btn-search-results span');
    if (value === undefined) value = locatorMap.classList.contains('show-results');
    if (!value) {
        innerBtn[0].classList.remove('icon-chevron-left');
        innerBtn[0].classList.add('icon-chevron-right');
        innerBtn[0].title = "Show Search Results";
        innerBtn[1].innerHTML = "Show List";
        locatorMap.classList.remove('hide-results');
        locatorMap.classList.add('show-results');
        locatorMap.classList.remove("large-8");
        locatorMap.classList.remove("medium-7");
        locatorMap.classList.add("large-12");
        locatorMap.classList.add("medium-12");
        resultsList.style.display = "none";
    } else {
        innerBtn[0].classList.remove('icon-chevron-right');
        innerBtn[0].classList.add('icon-chevron-left');
        innerBtn[0].title = "Hide Search Results";
        innerBtn[1].innerHTML = "Hide List";
        locatorMap.classList.remove('show-results');
        locatorMap.classList.add('hide-results');
        locatorMap.classList.remove("large-12");
        locatorMap.classList.remove("medium-12");
        locatorMap.classList.add("large-8");
        locatorMap.classList.add("medium-7");
        resultsList.style.display = "block";
    }
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
    let accordionHeading = constructAccordionHeading(data[daysUsed[getDay]+"_enabled"], data[daysUsed[getDay]+"_open"], data[daysUsed[getDay]+"_close"]);
    return `
        <ins-accordion>
            <ins-accordion-item 
                heading="${accordionHeading}" 
                icon="icon-clock"
                open-icon="icon-angle-down"
                close-icon="icon-angle-up">
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 0 ? `<span class="current-sched">Sunday</span>` : `Sunday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 0 ? `<span class="current-sched">${constructDaySchedule(data.sunday_enabled, data.sunday_open, data.sunday_close)}</span>` : `${constructDaySchedule(data.sunday_enabled, data.sunday_open, data.sunday_close)}`}
                    </div>
                </div>
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 1 ? `<span class="current-sched">Monday</span>` : `Monday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 1 ? `<span class="current-sched">${constructDaySchedule(data.monday_enabled, data.monday_open, data.monday_close)}</span>` : `${constructDaySchedule(data.monday_enabled, data.monday_open, data.monday_close)}`}
                    </div>
                </div>
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 2 ? `<span class="current-sched">Tuesday</span>` : `Tuesday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 2 ? `<span class="current-sched">${constructDaySchedule(data.tuesday_enabled, data.tuesday_open, data.tuesday_close)}</span>` : `${constructDaySchedule(data.tuesday_enabled, data.tuesday_open, data.tuesday_close)}`}
                    </div>
                </div>
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 3 ? `<span class="current-sched">Wednesday</span>` : `Wednesday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 3 ? `<span class="current-sched">${constructDaySchedule(data.wednesday_enabled, data.wednesday_open, data.wednesday_close)}</span>` : `${constructDaySchedule(data.wednesday_enabled, data.wednesday_open, data.wednesday_close)}`}
                    </div>
                </div>
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 4 ? `<span class="current-sched">Thursday</span>` : `Thursday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 4 ? `<span class="current-sched">${constructDaySchedule(data.thursday_enabled, data.thursday_open, data.thursday_close)}</span>` : `${constructDaySchedule(data.thursday_enabled, data.thursday_open, data.thursday_close)}`}
                    </div>
                </div>
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 5 ? `<span class="current-sched">Friday</span>` : `Friday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 5 ? `<span class="current-sched">${constructDaySchedule(data.friday_enabled, data.friday_open, data.friday_close)}</span>` : `${constructDaySchedule(data.friday_enabled, data.friday_open, data.friday_close)}`}
                    </div>
                </div>
                <div class='spacer x-small'></div>
                <div class="grid-x grid-padding-x">
                    <div class="large-3 medium-4 small-4 cell">${getDay == 6 ? `<span class="current-sched">Saturday</span>` : `Saturday`}</div>
                    <div class="large-9 medium-8 small-8 cell">
                        ${getDay == 6 ? `<span class="current-sched">${constructDaySchedule(data.saturday_enabled, data.saturday_open, data.saturday_close)}</span>` : `${constructDaySchedule(data.saturday_enabled, data.saturday_open, data.saturday_close)}`}
                    </div>
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
    return `${enabled ? `${!open && !close ? "Open" : `Open ${open ? open : 'n/a'} - ${close ? close : 'n/a'}`}` : "Closed"}`
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
                    <img width="340" src="${data.location_image.url 
                        ? data.location_image.url 
                        : `${domain}assets/modules/locator/images/default.png`}"
                        alt="${data.properties.location_name}"
                        title="${data.properties.location_name}" />
                ${link ? `</a>` : ''}
            </div>
            <div class="content-wrapper">
                ${link ? `<a href='${link}' target='_blank'>` : ''}
                    <span class='location-name'>${data.properties.location_name}</span>
                ${link ? `</a>` : ''}
                <div class='spacer small'></div>
                ${data.properties.short_description
                    ? `<div class="description"">
                            ${data.properties.short_description}
                        </div>
                        <div class='spacer small'></div>`
                    : ''}
                <p class="full-address">
                    <i class="icon-map location-icon"></i>
                    <span class="detail-label location-label">${constructAddress(data.properties)}</span>
                </p>
                <div class='spacer x-small'></div>
                <p class="location-p">
                    <i class="icon-clock location-icon"></i>
                    <span class="detail-label">${constructCardSchedule(data.properties)}</span>
                </p>
                <div class='spacer small'></div>
                <div class="links">
                    <ins-button outlined 
                        label='Enquire'
                        size='normal'
                        class='enquireLocationBtn'
                        id='enquire-${data.id}' 
                        data-id='${data.id}'
                        data-location_name="${data.properties.location_name}"
                        onclick="insLocatorForm.methods.showEnquiryForm('${data.properties.uuid}', \`${data.properties.location_name}\`)">
                    </ins-button>
                    ${link ? `<ins-button  solid
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
}

/*** Create opening hours html elements ***/
function constructCardSchedule(data) {
    let dateNow = new Date();
    let daysUsed = ['sunday', 'monday','tuesday','wednesday','thursday','friday','saturday'];
    let getDay = dateNow.getDay();
    let accordionHeading = constructAccordionHeading(data[daysUsed[getDay]+"_enabled"], data[daysUsed[getDay]+"_open"], data[daysUsed[getDay]+"_close"]);

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