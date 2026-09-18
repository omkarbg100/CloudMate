import { create } from "zustand";

export const useDeployMateStore = create((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),

  // Navigation
  selectedProjectId: "",
  activeView: "overview",
  activeFile: "backend/server.js",
  environment: "production",
  activeLogTab: "live",
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveFile: (file) => set({ activeFile: file }),
  setEnvironment: (environment) => set({ environment }),
  setActiveLogTab: (activeLogTab) => set({ activeLogTab }),

  // Transient review artefacts (proposals the AI produced this session).
  // Kept so the Overview lifecycle can reflect them without another API call.
  recentChanges: null,
  recentValidation: null,
  deploymentPlan: null,
  clearReview: () => set({ recentChanges: null, recentValidation: null, deploymentPlan: null }),
  setRecentChanges: (recentChanges) => set({ recentChanges }),
  setRecentValidation: (recentValidation) => set({ recentValidation }),
  setDeploymentPlan: (deploymentPlan) => set({ deploymentPlan }),

  // Agent chat
  messages: [
    {
      id: "msg_welcome",
      role: "assistant",
      content: `I'm your AI deployment engineer.

Connect a repository and an AWS account, then I'll analyze the codebase, design the infrastructure, scan for risks and walk you through validation and deployment — with your explicit approval at every step.`,
      nextActions: ["Analyze the repository", "Discover AWS resources", "Design an architecture"],
      approvalRequired: false,
      timestamp: new Date().toISOString(),
    },
  ],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),

  // Real-time events (WebSocket)
  events: [],
  pushEvent: (event) => set((state) => ({ events: [...state.events, event].slice(-400) })),
  clearEvents: () => set({ events: [] }),

  // Deployment
  currentDeploymentId: null,
  deploymentProgress: 0,
  setCurrentDeploymentId: (id) => set({ currentDeploymentId: id }),
  setDeploymentProgress: (progress) => set({ deploymentProgress: progress }),
}));