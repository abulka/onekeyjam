module.exports = {
    "env": {
        // "browser": true,
        "node": true, // to avoid 'module' is not defined.eslint(no-undef) error in this file 
        "es2021": true,
        "jquery": true,  // to avoid '$' is not defined.eslint(no-undef) error
    },
    "extends": [
        "eslint:recommended",
        "plugin:vue/vue3-essential"
    ],
    "overrides": [
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "vue"
    ],
    "rules": {
        "no-unused-vars": "off",  // ANDY added
    }
}
