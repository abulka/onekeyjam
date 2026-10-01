/**
 * @module lib/util
 * @desc Contains utility functions.
 */

/**
 * Returns a random number between min and max
 * @param {number} min 
 * @param {number} max 
 * @returns {number} random number between min and max
 */
export function getRandomArbitary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Get a number of random elements from an array - non-destructive (and fast)
 * @param {Array} arr array to scan
 * @param {number} n number of elements to return
 * @returns {Array} array of n elements
 * @see https://stackoverflow.com/questions/19269545/how-to-get-a-number-of-random-elements-from-an-array
 */
export function getRandomFromArray(arr, n) {
    // Get a number of random elements from an array?
    // Non-destructive (and fast) function: https://stackoverflow.com/questions/19269545/how-to-get-a-number-of-random-elements-from-an-array
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

export async function openJsonUrl(url) {
    const response = await fetch(url)
    // waits until the request completes...
    if (response.statusText !== 'OK') {
        console.log('error', response.statusText)
        return
    }
    const data = await response.json();
    return data
}
