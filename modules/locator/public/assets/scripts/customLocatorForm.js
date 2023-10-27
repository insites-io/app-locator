var insLocatorForm = (function () {
    const store = {}; // locations data from search results
    const locatorDrawer = document.getElementById('locator-form-drawer');
    const formEl = document.getElementById('locator-enquiry-form');

    const contForm = document.getElementById('locator-enquiry-cont');
    const contSuccess = document.getElementById('locator-enquiry-success');

    const urlParams = new URLSearchParams(window.location.search);
    const phoneFields = {
        inputTel: document.getElementById('phone-number-field'),
        mobile_phone: document.getElementById('mobile_phone'),
        country_code: document.getElementById('country_code')
    }

    return {
        data: {
            getData(field) {
                return store[field];
            },
            setData(field, value) {
                store[field] = value;
            },
            pushArrayData(field, value) {
                if (store[field] && store[field].length)
                    store[field] = store[field].concat(value);
                else
                    this.setData(field, value);
            }
        },
        utilities: {
            properCase: function (text) {
                return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
            },
            checkValue(value) {
                return value ? value : '';
            },
        },
        methods: {
            async validateForm(event) {
                event ? event.preventDefault() : '';
                // IF your form / instance have recaptcha enabled, uncommment captcha codes instead
                var captcha =this.checkRecaptcha(formEl);
                let valid = await App.validation.validateForm(formEl);
                let validPhoneField = await this.validateFormField();
                if (valid && validPhoneField && captcha) {
                    formEl.querySelector('ins-button').loading = true;
                    let formData = new FormData(formEl);
                    let response = await InsLocatorServices.processRequest(formEl.method, formEl.action, formData);
                    if(!response.data.error){
                        insLocatorForm.methods.showSuccessPrompt();
                    }
                    formEl.querySelector('ins-button').loading = false;
                    //formEl.submit();
                } else {
                    return false;
                }
            },
            async validateFormField(){
                let values = await phoneFields.inputTel.getValues();
                if (values.phone_number){
                    phoneFields.inputTel.hasError = false;
                    phoneFields.country_code.value = values.country_code;
                    phoneFields.mobile_phone.value = values.phone_number;
                    return true;
                } else {
                    phoneFields.inputTel.errorMessage = "Mobile Phone is required.";
                    phoneFields.inputTel.hasError = true;
                    return false;
                }
            },
            showEnquiryForm (uuid, name) {
                if (store.locations) {
                    let location = store.locations.find(item => item.properties.uuid === uuid);
                    locatorDrawer.isOpen = true;
                    this.updateFormLocationFields(location.properties.uuid, location.properties.location_name);
                } else {
                    if(uuid && name) {
                        this.updateFormLocationFields(uuid, name);
                        locatorDrawer.isOpen = true;
                    } else {
                        console.log("Error: No locations were set. ", store);
                    }
                }
                insLocatorForm.methods.toggleDrawerSearchResult();
            },
            updateFormLocationFields(uuid, location_name) {
                document.querySelector('#locator-form-drawer .ins-drawer-header h4').innerHTML = insLocatorForm.utilities.checkValue(location_name);
                document.getElementById('location_uuid_field').value = insLocatorForm.utilities.checkValue(uuid);
            },
            notifySuccess() {
                if (urlParams.get('success') === 'true') {
                    Swal.fire(
                        'Success!',
                        'Thank you, your enquiry has been received successfully.',
                        'success'
                    )
                }
            },
            toggleDrawerSearchResult() {
                locatorDrawer.addEventListener('insToggle', function(d) {
                    if(d.detail.status == 'close') {
                        insLocatorForm.methods.resetForm();
                    }
                });
            },
            async resetForm() {
                var input_field = document.querySelectorAll('#locator-enquiry-form ins-input, #locator-enquiry-form ins-textarea');
                formEl.reset();
                input_field.forEach((input) => {
                    input.setAttribute('has-error', false);
                });
                phoneFields.inputTel.hasError = false;

                grecaptcha.reset();
            },
            checkRecaptcha(formEl) {
                let isValid = formEl.querySelector('#g-recaptcha-response').value.trim() !== ''
                    ? true : false;
                isValid
                    ? document.getElementById('recaptcha-v2-wrapper').removeAttribute('has-error')
                    : document.getElementById('recaptcha-v2-wrapper').setAttribute('has-error', true);
                return isValid;
            },
            showSuccessPrompt(){
                contForm.classList.add('hide');
                contSuccess.classList.remove('hide');
            },
            closeSuccessPrompt(){
                insLocatorForm.methods.resetForm();
                contForm.classList.remove('hide');
                contSuccess.classList.add('hide');
                locatorDrawer.isOpen = false;
            }
        }
    }
})();

insLocatorForm.methods.notifySuccess();