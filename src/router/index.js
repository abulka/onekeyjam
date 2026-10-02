import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      name: 'record',
      component: () => import('../views/RecordView.vue')
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

export default router
