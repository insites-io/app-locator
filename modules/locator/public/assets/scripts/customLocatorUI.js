let selectedFilter1 = [];
let selectedFilter2 = [];
var insitesLocator = (function () {
    // search elements
    const searchSubmitBtn = document.getElementById('search-submit');
    const addressField = document.getElementById('address-search');
    const searchResults = document.getElementById('search-results');
    const searchDistanceEl = document.getElementById('search-distance');
    // const searchResultsBtn = document.getElementById('search-results-btn');
    const typButtons = document.querySelectorAll(".type-button");
    const filter1Group = document.getElementsByName('filter_1');
    const filter2 = document.getElementById("filter_2");
    const advancedFilterBtn = document.getElementById("advanced-filter-btn");

    return {
        events: {
            initEventListeners: function () {
                addressField.addEventListener('insIconClick', function (ev) {
                    if (navigator.geolocation) {
                        addressField.hasError = false;
                        navigator.geolocation.getCurrentPosition(function(position){
                            filter.location = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            }
                            addressField.value = "Current Location";
                            searchLocations("your current location");
                        });
                
                    } else {
                        addressFieldEl.hasError = true;
                        addressFieldEl.errorMessage = "Geolocation is not supported by this browser.";
                    }
                });

                addressField.addEventListener('keypress', function (ev) {
                    if (ev.keyCode === 13 || ev.keyCode === 18) ev.preventDefault();
                    if (ev.keyCode === 13) {
                        var options = document.querySelectorAll('.pac-container .pac-item')[0]
                        if (options && options.textContent){
                            let firstOptionValue = options.textContent;
                            addressField.hasError = false;
                            addressField.value = firstOptionValue;
                            geocodeAddress(firstOptionValue);
                        } else addressField.hasError = true;
                    }
                });
                searchSubmitBtn.addEventListener('click', function (ev) {
                    if (addressField.value){
                        addressField.hasError = false;
                        geocodeAddress(addressField.value);
                    } else addressField.hasError = true;
                });
                searchDistanceEl.addEventListener('insValueChange', function (ev) {
                    updateSearchRadius(ev.detail);
                });
                typButtons.forEach((btn) => {// index will be current button index
                    btn.addEventListener("click", function(e) {
                        typButtons.forEach( btns => btns.classList.remove('active') )
                        this.classList.add("active");
                        searchResults.className = '';
                        searchResults.classList.add(this.id);
                    });
                });
                filter1Group.forEach(field => {
                    field.addEventListener('insCheck', event => {
                        var event = event.detail;
                        // if checkbox is checked, push value to array
                        if(event.checked) {
                            selectedFilter1.push(event.value);
                        } else {
                            // else, remove item from array
                            selectedFilter1.splice(selectedFilter1.indexOf(event.value), 1);
                        }
                    });
                });
                filter2.addEventListener('insValueChange', event => {
                    selectedFilter2 = event.detail;
                });
                advancedFilterBtn.addEventListener('click', function (ev) {
                    var filtersContainer = document.getElementById('location-filters-container');
                    if (filtersContainer.classList.contains('hidden')) {
                        this.label = "Hide Filters";
                        filtersContainer.classList.remove("hidden");
                    } else {
                        this.label = "Advanced Filters";
                        filtersContainer.classList.add("hidden");
                    }
                    
                });
            },
        },
        methods: {
            searchInit: function () {
            }
        }
    }
})(); 