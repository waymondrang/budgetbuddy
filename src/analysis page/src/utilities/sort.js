/**
 * Sorts the given array of objects by the given property.
 * @param {*} data 
 * @param {*} field 
 * @param {*} secondary_field 
 * @param {boolean} reverse
 * @returns 
 */
function sort(data, field, secondary_field, reverse) {
    // eslint-disable-next-line array-callback-return
    let sorted_data = data.sort((a, b) => {
        // Time is given 
        let a_value = typeof a[field] === 'string' || a[field] instanceof String ? a[field].toLowerCase() : a[field];
        let b_value = typeof b[field] === 'string' || b[field] instanceof String ? b[field].toLowerCase() : b[field];
        if (field === "time") {
            let date_a = new Date(Date.parse(a["date"]));
            let date_b = new Date(Date.parse(b["date"]));
            let difference = ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24));
            if (difference !== 0 || !secondary_field)
                return difference;
            if (a[secondary_field] < b[secondary_field]) return -1;
            if (a[secondary_field] > b[secondary_field]) return 1;
            if (a[secondary_field] === b[secondary_field]) return 0;
        }

        if (a_value < b_value) return -1;
        if (a_value > b_value) return 1;
        if (a_value === b_value) {
            if (!secondary_field) return 0;
            if (secondary_field === "time") {
                let date_a = new Date(Date.parse(a["date"]));
                let date_b = new Date(Date.parse(b["date"]));
                let difference = ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24));
                return difference;
            }
            if (a[secondary_field] < b[secondary_field]) return -1;
            if (a[secondary_field] > b[secondary_field]) return 1;
            if (a[secondary_field] === b[secondary_field]) return 0;
        }
    });
    if (reverse) sorted_data = sorted_data.reverse();
    return sorted_data;
}

export default sort;