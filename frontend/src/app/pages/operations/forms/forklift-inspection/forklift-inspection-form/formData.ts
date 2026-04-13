export let formValues: any = {
    "shift": [{
        "name": "1st"
    },
    {
        "name": "2nd"
    },
    {
        "name": "3rd"
    }
    ],
    "department": [{
        "name": "Warehouse"
    },
    {
        "name": "Logistics"
    }
    ],
    "models": [{
        "name": "Sit Down Forklift",
        "details": [{
            "name": "SD1"
        },
        {
            "name": "SD2"
        },
        {
            "name": "SD3"
        },
        {
            "name": "SD4"
        }
        ]
    },
    {
        "name": "Stand Up Forklift",
        "details": [{
            "name": "SU1"
        },
        {
            "name": "SU2"
        },
        {
            "name": "SU3"
        }
        ]
    },
    {
        "name": "Cherry Pickers",
        "details": [{
            "name": "CP1"
        },
        {
            "name": "CP2"
        }
        ]
    }
    ],
    "checklist": [{
        "name": "General",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Leaks - Hydraulic Oil, Battery",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Tires - Condition and Pressure",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Load Backrest Extension - Attached",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Hydraulic Hoses, Mast Chains & Stops  Check Visually",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Finger Guards - Attached",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Overhead Guard - Attached",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        }
        ]
    },
    {
        "name": "Operator's Compartment",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Capacity Plate Attached - Information Matches Model, Serial Number and Attachments",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Battery Restraint System - Adjust and Fasten",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Seat Belt, Bukle and Retractors - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Brake Fluid - Check Level",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        }
        ]
    },
    {
        "name": "Controls (Turn Truck On) Unusual Noises Must Be Investigated Immediately",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Accelerator Linkage - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Parking Brake - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Service Brake - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Steering Operation - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Drive Control - Foward/Reverse - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Title Control - Foward/Reverse - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Hoist and Lowering Control - Functioning Smoothly",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Attachment Control - Operation",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Horn - Functioning",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Lights - Functioning",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        }
        ]
    },
    {
        "name": "Guages",
        "status": false,
        "needMaint": false,
        "details": [{
            "name": "Hour Meter - Functioning",
            "status": false,
            "needMaint": false,
            "error": false,
            "remarks": ""
        },
        {
            "name": "Battery Discharge Indicator - Functioning",
            "status": false,
            "needMaint": false,
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