export let formValues: any = {
    "checklist": [{
        "name": "Engine & Safety Systems",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Engine Oil and Coolant Levels",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Windshield & Mirrors",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Doors & Windows Operation",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Emergency Brake System",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Tire Condition & Pressure",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Fluid Leak Inspection",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        }
        ]
    },
    {
        "name": "Vehicle Operations & Documentation",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Insurance Documentation",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Vehicle Registration",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Vehicle Cleanliness & Damage Assessment",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Fuel Level & Dashboard Indicators",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Windshield Wipers & Washers",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Horn Function Test",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Lighting Systems Check",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Climate Control Systems",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        }
        ]
    }
    ]
}


export let resetVehicleInspectionFormValues = () => {
    for (let i = 0; i < formValues.checklist.length; i++) {
        formValues.checklist[i].status = false;
        formValues.checklist[i].needMaint = false;
        for (let ii = 0; ii < formValues.checklist[i].details.length; ii++) {
            formValues.checklist[i].details[ii].status = undefined;
            formValues.checklist[i].details[ii].needMaint = undefined;
            formValues.checklist[i].details[ii].error = false;
            formValues.checklist[i].details[ii].remarks = '';
        }
    }
}