/**
 * Will clean duplicate objects with the same id from the given array.
 * @param {*} data 
 */
function clean(data) {
    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
            if (data[i].id === data[j].id) {
                console.log("Matching id found: " + data[i].id);
                data[j].id = (data[j].id).substring(0, (data[j].id).length - `${j}`.length) + j; // This preserves the length of the id
            }
        }
    }
    return data;
}

function clean_v2(data) {
    for (let i = 0; i < data.length; i++) {
        if (data[i].matched) {
            data[i].id = (data[i].id).substring(0, (data[i].id).length - `${i}`.length) + i; // This preserves the length of the id
        }
    }
}

export default clean;

export { clean_v2 };