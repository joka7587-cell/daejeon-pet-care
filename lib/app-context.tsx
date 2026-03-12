import React, { createContext, useContext, useReducer, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserRole = "owner" | "caretaker" | null;

export type Neighborhood =
  | "유성구"
  | "둔산"
  | "관평"
  | "노은"
  | "봉명"
  | "대덕구"
  | "중구"
  | "동구"
  | "서구";

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  size: "소형" | "중형" | "대형";
  emoji: string;
}

export interface UserProfile {
  nickname: string;
  neighborhood: Neighborhood | null;
  role: UserRole;
  bio: string;
  pets: Pet[];
  rating: number;
  reviewCount: number;
  isCaretakerActive: boolean;
  caretakerServices: string[];
  joinedAt: string;
}

interface AppState {
  isOnboarded: boolean;
  profile: UserProfile;
}

type AppAction =
  | { type: "SET_ONBOARDED"; payload: boolean }
  | { type: "SET_ROLE"; payload: UserRole }
  | { type: "SET_NEIGHBORHOOD"; payload: Neighborhood }
  | { type: "SET_PROFILE"; payload: Partial<UserProfile> }
  | { type: "ADD_PET"; payload: Pet }
  | { type: "TOGGLE_CARETAKER_ACTIVE" }
  | { type: "LOAD_STATE"; payload: AppState };

const initialProfile: UserProfile = {
  nickname: "",
  neighborhood: null,
  role: null,
  bio: "",
  pets: [],
  rating: 0,
  reviewCount: 0,
  isCaretakerActive: false,
  caretakerServices: [],
  joinedAt: new Date().toISOString(),
};

const initialState: AppState = {
  isOnboarded: false,
  profile: initialProfile,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ONBOARDED":
      return { ...state, isOnboarded: action.payload };
    case "SET_ROLE":
      return { ...state, profile: { ...state.profile, role: action.payload } };
    case "SET_NEIGHBORHOOD":
      return { ...state, profile: { ...state.profile, neighborhood: action.payload } };
    case "SET_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case "ADD_PET":
      return { ...state, profile: { ...state.profile, pets: [...state.profile.pets, action.payload] } };
    case "TOGGLE_CARETAKER_ACTIVE":
      return { ...state, profile: { ...state.profile, isCaretakerActive: !state.profile.isCaretakerActive } };
    case "LOAD_STATE":
      return action.payload;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  saveState: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "@petcare_app_state";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AppState;
          dispatch({ type: "LOAD_STATE", payload: parsed });
        }
      } catch (_) {}
    })();
  }, []);

  const saveState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  };

  useEffect(() => {
    saveState();
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, saveState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
