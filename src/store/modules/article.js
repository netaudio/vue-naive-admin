import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request as api } from '@/utils'

export const useArticleStore = defineStore('article', () => {
  const articles = ref([])
  const categories = ref([])
  const tags = ref([])
  const loading = ref(false)

  // 获取文章列表
  const getArticles = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/articles', { params })
      articles.value = response.data.list
      return response.data
    } catch (error) {
      console.error('获取文章列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取文章详情
  const getArticle = async (id) => {
    try {
      const response = await api.get(`/articles/${id}`)
      return response.data
    } catch (error) {
      console.error('获取文章详情失败:', error)
      throw error
    }
  }

  // 创建文章
  const createArticle = async (articleData) => {
    try {
      const response = await api.post('/articles', articleData)
      return response.data
    } catch (error) {
      console.error('创建文章失败:', error)
      throw error
    }
  }

  // 更新文章
  const updateArticle = async (id, articleData) => {
    try {
      const response = await api.patch(`/articles/${id}`, articleData)
      return response.data
    } catch (error) {
      console.error('更新文章失败:', error)
      throw error
    }
  }

  // 删除文章
  const deleteArticle = async (id) => {
    try {
      await api.delete(`/articles/${id}`)
    } catch (error) {
      console.error('删除文章失败:', error)
      throw error
    }
  }

  // 点赞文章
  const likeArticle = async (id) => {
    try {
      const response = await api.post(`/articles/${id}/like`)
      return response.data
    } catch (error) {
      console.error('点赞失败:', error)
      throw error
    }
  }

  // 收藏文章
  const favoriteArticle = async (id) => {
    try {
      const response = await api.post(`/articles/${id}/favorite`)
      return response.data
    } catch (error) {
      console.error('收藏失败:', error)
      throw error
    }
  }

  // 获取分类列表
  const getCategories = async () => {
    try {
      const response = await api.get('/articles/categories')
      categories.value = response.data
      return response.data
    } catch (error) {
      console.error('获取分类失败:', error)
      throw error
    }
  }

  // 获取标签列表
  const getTags = async () => {
    try {
      const response = await api.get('/articles/tags')
      tags.value = response.data
      return response.data
    } catch (error) {
      console.error('获取标签失败:', error)
      throw error
    }
  }

  return {
    articles,
    categories,
    tags,
    loading,
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    likeArticle,
    favoriteArticle,
    getCategories,
    getTags
  }
})
