/**
 * Will clean duplicate objects with the same id from the given array.
 * @param {*} data 
 */
function clean(data) {
    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
            if (data[i].id === data[j].id) {
                data[j].id = (data[j].id).substring(0, (data[j].id).length - `${j}`.length) + j; // This preserves the length of the id
            }
        }
    }
    return data;
}

export default clean;