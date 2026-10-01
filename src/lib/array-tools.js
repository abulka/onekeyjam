// import { isEqual } from 'lodash';  // not nodejs compatible
import pkg from 'lodash';
const { isEqual } = pkg;

export const includesArray2 = (haystack, needle) => {
    // Check if an array includes an array - Andy's version - accurate.  Uses lodash.
    for (let arr of haystack)
        if (isEqual(arr, needle)) {
            return true
        }
    return false
}

export const includesArray1 = (array1, arr) => {  // This is BUGGY
    // https://stackoverflow.com/questions/64303074/check-if-an-array-includes-an-array-in-javascript
    /*
    My comment on SO: Just found a bug in the includesArray algorithm e.g.
    console.log(includesArray(arr, [1, 2, 3])); returns true instead of false.
    The array [1, 2, 3] is NOT present in arr, yet is found.

        var arr = ['hello', 2, 4, [1, 2]];
        const includesArray = (data, arr) => {
            return data.some(e => Array.isArray(e) && e.every((o, i) => Object.is(arr[i], o)));
        }

        console.log(includesArray(arr, [1, 2]));
        console.log(includesArray(arr, [1, 2, 3]));  // <-- BUG returns true instead of false. 
    */
    return array1.some(e => Array.isArray(e) && e.every((o, i) => Object.is(arr[i], o)));
}

export function includesArray3(array1, arr) {
    // Accurate - https://stackoverflow.com/questions/19543514/check-whether-an-array-exists-in-an-array-of-arrays
    function searchForArray(haystack, needle) {
        var i, j, current;
        for (i = 0; i < haystack.length; ++i) {
            if (needle.length === haystack[i].length) {
                current = haystack[i];
                for (j = 0; j < needle.length && needle[j] === current[j]; ++j);
                if (j === needle.length)
                    return i;
            }
        }
        return -1;
    }
    return searchForArray(array1, arr) === -1 ? false : true
}

// ╔═╗┬─┐┬─┐┌─┐┬ ┬┌─┐  ╔═╗┌─┐ ┬ ┬┌─┐┬  
// ╠═╣├┬┘├┬┘├─┤└┬┘└─┐  ║╣ │─┼┐│ │├─┤│  
// ╩ ╩┴└─┴└─┴ ┴ ┴ └─┘  ╚═╝└─┘└└─┘┴ ┴┴─┘

// Arrays are equal, in any order
export const arraysAreEqual = (firstArr, secondArr) => isEqual(firstArr, secondArr)

// Alternative, handcrafted version:
// export const arraysAreEqual = (firstArr, secondArr) => firstArr.length === secondArr.length &&
//     firstArr.every((value, index) => value === secondArr[index]);

