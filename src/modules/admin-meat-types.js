import { $, validInput, statusMessage, canSendToFirebase } from "./utils.js";
import * as FB from "firebase/database";
import { db } from "./data.js";

let adminMeatTypes = [];

export function getAdminMeatTypes() {
    return adminMeatTypes;
}

export function setAdminMeatTypes(types) {
    adminMeatTypes = types;
}

async function getMeatTypesFromFirebase() {
    const snapshot = await FB.get(FB.ref(db, "meals/meatCategories"));
    if (!snapshot.exists()) return [];
    const raw = String(snapshot.val() || "");
    return raw ? raw.split(",") : [];
}

async function refreshMeatTypesFromFirebase() {
    try {
        setAdminMeatTypes(await getMeatTypesFromFirebase());
    } catch (error) {
        console.error(error);
    }
}

export function selectAdminMeatType(meat) {
    $("#editMeatTypes").value = "";
    $("#newMeatTypeName").value = meat;
    $("#newMeatTypeName").dataset.meattype = meat;
}

async function deleteAdminMeatType(meatType) {
    if (!canSendToFirebase($("#meatTypeStatus"))) {
        return;
    }

    let meatTypes = await getMeatTypesFromFirebase();
    meatTypes.splice(meatTypes.indexOf(meatType), 1);
    meatTypes.sort();
    try {
        await FB.set(FB.ref(db, "meals/meatCategories"), meatTypes.join(","));
        $("#editMeatTypes").value = "";
        $("#newMeatTypeName").value = "";
        $("#newMeatTypeName").dataset.meattype = "";
        statusMessage($("#meatTypeStatus"), "Meat Type '" + meatType + "' deleted successfully!");
    } catch (error) {
        console.error(error);
        statusMessage($("#meatTypeStatus"), "Could not delete meat type.");
    }
}

async function editAdminMeatType() {
    if (!canSendToFirebase($("#meatTypeStatus"))) {
        return;
    }

    let changedMeatType = $("#newMeatTypeName").value;
    let oldMeatType = $("#newMeatTypeName").dataset.meattype;
    if (changedMeatType == "") {
        statusMessage(
            $("#meatTypeStatus"),
            "Please select an option from the Meat Type List first."
        );
    } else {
        let meatTypes = await getMeatTypesFromFirebase();

        if (!meatTypes.some((item) => item == oldMeatType)) {
            statusMessage(
                $("#meatTypeStatus"),
                "The Meat Type '" + oldMeatType + "' does not exist, unable to save."
            );
        } else {
            meatTypes.splice(meatTypes.indexOf(oldMeatType), 1, changedMeatType);
            try {
                await FB.set(FB.ref(db, "meals/meatCategories"), meatTypes.join(","));
                statusMessage(
                    $("#meatTypeStatus"),
                    "Meat Type: '" + oldMeatType + "' updated to: '" + changedMeatType + "'"
                );
            } catch (error) {
                console.error(error);
                statusMessage($("#meatTypeStatus"), "Could not update meat type.");
            }
        }
    }
}

async function newAdminMeatType() {
    if (!canSendToFirebase($("#meatTypeStatus"))) {
        return;
    }

    let newMeatType = $("#newMeatTypeName").value;
    if (newMeatType == "") {
        statusMessage($("#meatTypeStatus"), "Please enter a new Meat Type name.");
        return;
    }

    let meatTypes = await getMeatTypesFromFirebase();
    if (meatTypes.some((item) => item == newMeatType)) {
        statusMessage($("#meatTypeStatus"), "This Meat Type already exists!");
    } else {
        meatTypes.push(newMeatType);
        meatTypes.sort();
        try {
            await FB.set(FB.ref(db, "meals/meatCategories"), meatTypes.join(","));
            $("#newMeatTypeName").dataset.meattype = newMeatType;
            statusMessage($("#meatTypeStatus"), "New Meat Type Added!");
        } catch (error) {
            console.error(error);
            statusMessage($("#meatTypeStatus"), "Could not add meat type.");
        }
    }
}

export function initAdminMeatTypes(filterSearchFn, onDataUpdated) {
    $("#editMeatTypes").addEventListener("input", () => {
        $("#editMeatTypeList").classList.add("showAdminList");
        filterSearchFn($("#editMeatTypes"), $("#editMeatTypeList"), adminMeatTypes);
    });

    $("#editMeatTypes").addEventListener("focus", () => {
        $("#editMeatTypeList").classList.add("showAdminList");
        filterSearchFn($("#editMeatTypes"), $("#editMeatTypeList"), adminMeatTypes);
    });

    $("#adminMeatTypeListDropDown").addEventListener("click", () => {
        $("#editMeatTypeList").classList.toggle("showAdminList");
        let isVisible = $("#editMeatTypeList").classList.contains("showAdminList");
        $("#adminMeatTypeListDropDown").style.setProperty('--adminListDropDownIcon', isVisible ? '"\ue5ce"' : '"\ue5cf"');
        filterSearchFn($("#editMeatTypes"), $("#editMeatTypeList"), adminMeatTypes);
    });

    $("#newAdminMeatType").addEventListener("click", () => {
        if (!validInput($("#meatTypeStatus"), $("#newMeatTypeName").value)) {
            return;
        }
        newAdminMeatType();
    });

    $("#delAdminMeatType").addEventListener("click", async () => {
        if (!validInput($("#meatTypeStatus"), $("#newMeatTypeName").value)) {
            return;
        }
        let meatType = $("#newMeatTypeName").value;
        let meatTypes = await getMeatTypesFromFirebase();

        if (!meatTypes.some((el) => el == meatType)) {
            statusMessage(
                $("#meatTypeStatus"),
                "Non-existent meat type! Cannot Delete."
            );
            return;
        }

        if (meatType == "") {
            statusMessage($("#meatTypeStatus"), "No meat type selected for deletion!");
            return;
        } else {
            if (confirm("You are about to DELETE meat type: '" + meatType + "'! Confirm?")) {
                deleteAdminMeatType(meatType);
            }
        }
    });

    $("#editAdminMeatType").addEventListener("click", () => {
        if (!validInput($("#meatTypeStatus"), $("#newMeatTypeName").value)) {
            return;
        }
        let meatType = $("#newMeatTypeName").value;

        if (meatType == "") {
            statusMessage($("#meatTypeStatus"), "No Meat Type selected for changes!");
        } else {
            editAdminMeatType();
        }
    });

    const updateAndNotify = () => refreshMeatTypesFromFirebase().then(() => { if (onDataUpdated) onDataUpdated(); });
    updateAndNotify();
    FB.onValue(FB.ref(db, "meals/meatCategories"), updateAndNotify);
}
