var insitesLocator = (function () {
    // search elements
    const searchSubmitBtn = document.getElementById('search-submit');
    const addressField = document.getElementById('address-search');
    const searchResults = document.getElementById('search-results');
    const searchDistanceEl = document.getElementById('search-distance');
    // const searchResultsBtn = document.getElementById('search-results-btn');

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
            },
        },
        methods: {
            searchInit: function () {
            }
        }
    }
})(); 