import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../assets/modules/fbconfig.js";
import { getAuth, signInAnonymously } from "firebase/auth";
import * as FB from "firebase/database";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = FB.getDatabase();

export const refs = {
    mealsInfo: FB.ref(db, "meals/info"),
    mealType: FB.ref(db, "meals/mealCategories"),
    meatType: FB.ref(db, "meals/meatCategories"),
    suggestions: FB.ref(db, "suggestions"),
    fbPrevious: FB.ref(db, "weeks/previous"),
    fbCurrent: FB.ref(db, "weeks/current"),
    fbNext: FB.ref(db, "weeks/next"),
};

const callbacks = {
    onWeekUpdated: null,
    onSuggestionsUpdated: null,
};

export function setDataCallbacks(cb) {
    Object.assign(callbacks, cb);
}

function normalizeMeals(rawMeals) {
    if (!rawMeals || typeof rawMeals !== "object") return [];
    return Object.values(rawMeals).map((meal) => [
        meal.meatType,
        meal.mealName,
        meal.meal,
        meal.mealType,
        meal.timestamp,
    ]);
}

function keyToPath(key) {
    switch (key) {
        case "previous":
            return "weeks/previous";
        case "current":
            return "weeks/current";
        case "next":
            return "weeks/next";
        case "mealTypes":
            return "meals/mealCategories";
        case "meatTypes":
            return "meals/meatCategories";
        case "suggestions":
            return "suggestions";
        case "meals":
            return "meals/info";
        default:
            return key;
    }
}

export async function getData(key) {
    const snapshot = await FB.get(FB.ref(db, keyToPath(key)));
    if (!snapshot.exists()) {
        if (key === "meals") return [];
        return null;
    }

    const value = snapshot.val();
    return key === "meals" ? normalizeMeals(value) : value;
}

export async function setData(key, value) {
    return FB.set(FB.ref(db, keyToPath(key)), value);
}

export async function loadData() {
    const prevObj = FB.get(refs.fbPrevious).then((snapshot) => snapshot.val());
    const currObj = FB.get(refs.fbCurrent).then((snapshot) => snapshot.val());
    const nextObj = FB.get(refs.fbNext).then((snapshot) => snapshot.val());
    const suggestionsObj = FB.get(refs.suggestions).then((snapshot) => snapshot.val());

    const [prev, curr, next, suggestions] = await Promise.all([
        prevObj,
        currObj,
        nextObj,
        suggestionsObj,
    ]);

    if (typeof callbacks.onWeekUpdated === "function") {
        callbacks.onWeekUpdated({ previous: prev, current: curr, next });
    }

    if (typeof callbacks.onSuggestionsUpdated === "function") {
        callbacks.onSuggestionsUpdated(suggestions || {});
    }
}

export function registerRealtimeListeners() {
    const updateWeek = (data, week) => {
        const val = data.val();
        const day = data.key;
        if (typeof callbacks.onWeekUpdated === "function") {
            callbacks.onWeekUpdated({ week, day, val });
        }
    };

    FB.onChildChanged(refs.fbPrevious, (data) => updateWeek(data, "previous"));
    FB.onChildChanged(refs.fbCurrent, (data) => updateWeek(data, "current"));
    FB.onChildChanged(refs.fbNext, (data) => updateWeek(data, "next"));
    FB.onValue(refs.suggestions, (snapshot) => {
        if (typeof callbacks.onSuggestionsUpdated === "function") {
            callbacks.onSuggestionsUpdated(snapshot.val() || {});
        }
    });
}

export function setWeekDay(week, day, val) {
    return FB.set(FB.ref(db, `/weeks/${ week }/${ day }/`), val);
}

export { signInAnonymously, FB };
