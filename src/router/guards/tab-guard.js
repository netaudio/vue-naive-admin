/**********************************
 * @Author: Ronnie Zhang
 * @LastEditor: Ronnie Zhang
 * @LastEditTime: 2023/12/05 21:25:17
 * @Email: zclzone@outlook.com
 * Copyright © 2023 Ronnie Zhang(大脸怪) | https://isme.top
 **********************************/

import { useTabStore, useArticleStore } from '@/store'

export const EXCLUDE_TAB = ['/404', '/403', '/login']

export function createTabGuard(router) {
  router.afterEach(async (to) => {
    if (EXCLUDE_TAB.includes(to.path))
      return
    const tabStore = useTabStore()
    const articleStore = useArticleStore()
    const { name, fullPath: path } = to
    let title = to.meta?.title
    const icon = to.meta?.icon
    const keepAlive = to.meta?.keepAlive

    if (to.meta.dynamicTitle && to.params.id) {
      try {
        // 获取文章数据（假设有 API 方法）
        const articleData = await articleStore.getArticle(to.params.id)
        // 更新路由 meta 标题
        title = articleData.title

      } catch (error) {
        console.error('获取文章标题失败', error)
        to.meta.title = '文章详情' // 回退默认标题
      }
    }

    tabStore.addTab({ name, path, title, icon, keepAlive })
  })
}
