import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { rememberScroll, scrollFor } from '../lib/scrollMemory.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  // Restore the scroll position remembered for each page, so toggling pages
  // with Tab and Shift+Tab keeps your place.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition)
      return savedPosition
    return { top: scrollFor(to.fullPath), left: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/index.html',
      redirect: '/'
    },
    {
      path: '/perform',
      name: 'perform',
      component: () => import('../views/PerformView.vue')
    },
    {
      path: '/record',
      redirect: '/perform'
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue')
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    },
    // The Research view is a development-only playground. In production it is
    // not registered, so its code is not shipped and deep links redirect home.
    ...(import.meta.env.DEV
      ? [
          {
            path: '/research',
            name: 'research',
            component: () => import('../views/ResearchView.vue')
          }
        ]
      : [{ path: '/research', redirect: '/' }])
  ]
})

// Remember where the user was before each navigation so scrollBehavior can
// restore it when they come back.
router.beforeEach((to, from) => {
  if (typeof window !== 'undefined')
    rememberScroll(from.fullPath, window.scrollY)
})

export default router
