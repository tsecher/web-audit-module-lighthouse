# Lighthouse (Web audit Module)

Lighhouse module for web_audit.

## Install
1. Install with your favorite package manager
2. Add the module in your web-audit.config.js 
```
export const config = {
	modules: [
        ...
        'node_modules/web-audit-module-lighthouse/src/modules/LighthouseModule.js'
    ],
},
```

## Report
By default the html report files are not created. To add reports files, add this in your web-audit.config.js : 
```
export const config = {
	...
    lighthouse: {
        report: true,
    }
```
