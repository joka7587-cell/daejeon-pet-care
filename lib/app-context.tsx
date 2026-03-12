import React, { createContext, useContext, useReducer, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendLocalNotification, updateBadge } from "@/lib/push-notifications";

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
  photoUri?: string;
}

export interface Review {
  id: string;
  fromUserId: string;
  fromNickname: string;
  rating: number;
  content: string;
  serviceType: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  nickname: string;
  profileEmoji: string;
  neighborhood: string;
  role: "owner" | "caretaker";
  addedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorNickname: string;
  authorEmoji: string;
  category: "자유" | "산책" | "돌봄" | "정보";
  title: string;
  content: string;
  imageUri?: string;
  likes: string[];
  comments: PostComment[];
  createdAt: string;
  neighborhood: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
}

export interface CareRequest {
  id: string;
  type: "walk_partner" | "caretaker" | "walk_request" | "emergency" | "short_care";
  title: string;
  requester: string;
  neighborhood: string;
  date: string;
  time: string;
  duration: string;
  petName: string;
  petEmoji: string;
  status: "pending" | "accepted" | "completed" | "cancelled" | "rejected";
  isUrgent?: boolean;
  description: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "comment" | "like" | "match_request" | "message" | "friend_add" | "match";
  title: string;
  body: string;
  relatedId?: string;
  fromNickname?: string;
  fromEmoji?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  requestId?: string;
  amount: number;
  method: "kakaopay" | "toss" | "kakao" | "card";
  status: "pending" | "completed" | "cancelled";
  fromUserId?: string;
  toUserId?: string;
  description?: string;
  serviceType?: string;
  caretakerName?: string;
  createdAt: string;
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
  friendCode: string;
  friends: Friend[];
  reviews: Review[];
  payments: Payment[];
}

interface AppState {
  isOnboarded: boolean;
  isLoaded: boolean;
  profile: UserProfile;
  posts: Post[];
  payments: Payment[];
  notifications: Notification[];
  requests: CareRequest[];
  chatMessages: Record<string, ChatMessageData[]>;
}

export interface ChatMessageData {
  id: string;
  senderId: number;
  senderName: string;
  content: string;
  type: "text" | "image";
  imageUri?: string;
  createdAt: string;
}

type AppAction =
  | { type: "SET_ONBOARDED"; payload: boolean }
  | { type: "SET_ROLE"; payload: UserRole }
  | { type: "SET_NEIGHBORHOOD"; payload: Neighborhood }
  | { type: "SET_PROFILE"; payload: Partial<UserProfile> }
  | { type: "ADD_PET"; payload: Pet }
  | { type: "UPDATE_PET"; payload: { petId: string; updates: Partial<Pet> } }
  | { type: "REMOVE_PET"; payload: string }
  | { type: "TOGGLE_CARETAKER_ACTIVE" }
  | { type: "ADD_FRIEND"; payload: Friend }
  | { type: "REMOVE_FRIEND"; payload: string }
  | { type: "ADD_REVIEW"; payload: Review }
  | { type: "ADD_POST"; payload: Post }
  | { type: "LIKE_POST"; payload: { postId: string; userId: string } }
  | { type: "ADD_COMMENT"; payload: { postId: string; comment: PostComment } }
  | { type: "ADD_PAYMENT"; payload: Payment }
  | { type: "UPDATE_PAYMENT_STATUS"; payload: { paymentId: string; status: Payment["status"] } }
  | { type: "DELETE_POST"; payload: string }
  | { type: "EDIT_POST"; payload: { postId: string; title: string; content: string; category: Post["category"] } }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "ADD_REQUEST"; payload: CareRequest }
  | { type: "UPDATE_REQUEST_STATUS"; payload: { requestId: string; status: CareRequest["status"] } }
  | { type: "ADD_CHAT_MESSAGE"; payload: { roomId: string; message: ChatMessageData } }
  | { type: "SET_CHAT_MESSAGES"; payload: { roomId: string; messages: ChatMessageData[] } }
  | { type: "LOAD_STATE"; payload: AppState }
  | { type: "RESET_APP" };

function generateFriendCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 4) + "-" + code.slice(4);
}

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
  friendCode: generateFriendCode(),
  friends: [],
  reviews: [],
  payments: [],
};

const initialState: AppState = {
  isOnboarded: false,
  isLoaded: false,
  profile: initialProfile,
  posts: [],
  payments: [],
  notifications: [],
  requests: [],
  chatMessages: {},
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
    case "UPDATE_PET":
      return {
        ...state,
        profile: {
          ...state.profile,
          pets: state.profile.pets.map((p) =>
            p.id === action.payload.petId ? { ...p, ...action.payload.updates } : p
          ),
        },
      };
    case "REMOVE_PET":
      return { ...state, profile: { ...state.profile, pets: state.profile.pets.filter((p) => p.id !== action.payload) } };
    case "TOGGLE_CARETAKER_ACTIVE":
      return { ...state, profile: { ...state.profile, isCaretakerActive: !state.profile.isCaretakerActive } };
    case "ADD_FRIEND":
      return { ...state, profile: { ...state.profile, friends: [...state.profile.friends, action.payload] } };
    case "REMOVE_FRIEND":
      return { ...state, profile: { ...state.profile, friends: state.profile.friends.filter(f => f.id !== action.payload) } };
    case "ADD_REVIEW": {
      const newReviews = [...state.profile.reviews, action.payload];
      const avgRating = newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;
      return {
        ...state,
        profile: {
          ...state.profile,
          reviews: newReviews,
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: newReviews.length,
        },
      };
    }
    case "ADD_POST":
      return { ...state, posts: [action.payload, ...state.posts] };
    case "LIKE_POST":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.payload.postId
            ? {
                ...p,
                likes: p.likes.includes(action.payload.userId)
                  ? p.likes.filter((id) => id !== action.payload.userId)
                  : [...p.likes, action.payload.userId],
              }
            : p
        ),
      };
    case "ADD_COMMENT":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.payload.postId
            ? { ...p, comments: [...p.comments, action.payload.comment] }
            : p
        ),
      };
    case "ADD_PAYMENT":
      return { ...state, payments: [...state.payments, action.payload] };
    case "UPDATE_PAYMENT_STATUS":
      return {
        ...state,
        payments: state.payments.map((p) =>
          p.id === action.payload.paymentId ? { ...p, status: action.payload.status } : p
        ),
      };
    case "DELETE_POST":
      return { ...state, posts: state.posts.filter((p) => p.id !== action.payload) };
    case "EDIT_POST":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.payload.postId
            ? { ...p, title: action.payload.title, content: action.payload.content, category: action.payload.category }
            : p
        ),
      };
    case "ADD_NOTIFICATION": {
      // 로컬 푸시 알림 전송
      sendLocalNotification({
        title: action.payload.title,
        body: action.payload.body,
        data: { type: action.payload.type, relatedId: action.payload.relatedId },
      });
      const newNotifications = [action.payload, ...state.notifications];
      const unreadCount = newNotifications.filter(n => !n.isRead).length;
      updateBadge(unreadCount);
      return { ...state, notifications: newNotifications };
    }
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
      };
    case "MARK_ALL_NOTIFICATIONS_READ": {
      updateBadge(0);
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      };
    }
    case "ADD_REQUEST":
      return { ...state, requests: [action.payload, ...state.requests] };
    case "UPDATE_REQUEST_STATUS":
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.payload.requestId ? { ...r, status: action.payload.status } : r
        ),
      };
    case "ADD_CHAT_MESSAGE": {
      const roomKey = action.payload.roomId;
      const existing = state.chatMessages[roomKey] || [];
      return {
        ...state,
        chatMessages: {
          ...state.chatMessages,
          [roomKey]: [...existing, action.payload.message],
        },
      };
    }
    case "SET_CHAT_MESSAGES":
      return {
        ...state,
        chatMessages: {
          ...state.chatMessages,
          [action.payload.roomId]: action.payload.messages,
        },
      };
    case "LOAD_STATE":
      return {
        ...initialState,
        ...action.payload,
        isLoaded: true,
        profile: {
          ...initialProfile,
          ...action.payload.profile,
          friends: action.payload.profile?.friends ?? [],
          reviews: action.payload.profile?.reviews ?? [],
          pets: action.payload.profile?.pets ?? [],
          payments: action.payload.profile?.payments ?? [],
        },
        posts: action.payload.posts ?? [],
        payments: action.payload.payments ?? [],
        notifications: action.payload.notifications ?? [],
        requests: action.payload.requests ?? [],
        chatMessages: action.payload.chatMessages ?? {},
      };
    case "RESET_APP":
      return { ...initialState, isLoaded: true, profile: { ...initialProfile, friendCode: generateFriendCode() } };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  saveState: () => Promise<void>;
  resetApp: () => Promise<void>;
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
        } else {
          dispatch({ type: "LOAD_STATE", payload: initialState });
        }
      } catch (_) {
        dispatch({ type: "LOAD_STATE", payload: initialState });
      }
    })();
  }, []);

  const saveState = async () => {
    try {
      if (state.isLoaded) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (_) {}
  };

  const resetApp = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      dispatch({ type: "RESET_APP" });
    } catch (_) {}
  };

  useEffect(() => {
    saveState();
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, saveState, resetApp }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
