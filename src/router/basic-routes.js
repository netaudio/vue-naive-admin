export const basicRoutes = [
  {
    name: 'Login',
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录页',
      layout: 'empty',
    },
  },

  {
    name: 'Home',
    path: '/',
    component: () => import('@/views/home/index.vue'),
    meta: {
      title: '首页',
    },
  },

  {
    name: '404',
    path: '/404',
    component: () => import('@/views/error-page/404.vue'),
    meta: {
      title: '页面飞走了',
      layout: 'empty',
    },
  },

  {
    name: '403',
    path: '/403',
    component: () => import('@/views/error-page/403.vue'),
    meta: {
      title: '没有权限',
      layout: 'empty',
    },
  },



  {
    name: 'ArticleDetail',
    path: '/articles/:id',
    component: () => import('@/views/articles/ArticleDetail.vue'),
    props: true, // 这将把路由参数作为 props 传递给组件
    meta: {
      dynamicTitle: true // 标记需要动态更新标题
    }
  }
]
