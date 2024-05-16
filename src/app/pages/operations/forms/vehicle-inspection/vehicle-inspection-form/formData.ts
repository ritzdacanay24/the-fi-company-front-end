export let formValues: any = {
    "checklist": [{
        "name": "General",
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
            "name": "Winshield & Mirrors",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Doors & Windows",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Emergency Brake",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Tires - Wear & Pressure",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Check ground under vehicle for fluid leaks",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        }
        ]
    },
    {
        "name": "Documentation",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Insurance Card",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Registration",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Check for cleanliness & Damages [interior and exterior]",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Fuel Level, Gauges, & Dash warning lights",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Winshield Wipers",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Horn",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Head Lights, Tail Lights, Turn Signals, Flashers, Warning Lights",
            "status": undefined,
            "needMaint": undefined,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Defrosters, Heaters, & Air Conditioner [when applicable]",
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