const fs = require('fs');
const path = require('path');

const menuJson = {
	"table": "menu",
	"rows":
	[
		{
			"parent_id": null,
			"label": "UL Label",
			"icon": null,
			"link": "/dashboard/ul-management/v3",
			"description": null,
			"isCollapsed": null,
			"accessRequired": 0,
			"badge": null,
			"isTitle": null,
			"hideCheckBox": null,
			"active": 1,
			"seq": null,
			"activatedRoutes": null
		},
		// ... (truncated for brevity, but in actual code, include all rows from the JSON)
		{
			"parent_id": 75,
			"label": "Cycle Time",
			"icon": null,
			"link": null,
			"description": null,
			"isCollapsed": 1,
			"accessRequired": 1,
			"badge": null,
			"isTitle": null,
			"hideCheckBox": null,
			"active": 1,
			"seq": null,
			"activatedRoutes": null
		}
	]
};

// Add ids to each row
menuJson.rows.forEach((row, index) => {
	row.id = index + 1;
});

// Generate the TypeScript export
const output = `export const MENU_DATA = ${JSON.stringify(menuJson, null, 2)};`;

// Write to menu-data.ts
fs.writeFileSync(path.join(__dirname, 'menu-data.ts'), output);

console.log('Menu data updated successfully.');
