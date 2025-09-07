<template>
  <div class="article-detail">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <div>加载中...</div>
    </div>

    <div v-else-if="article" class="article-content">
      <!-- 文章头部 -->
      <div class="article-header">
        <button class="back-btn" @click="goBack">← 返回</button>
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <div class="meta-item">
            <span class="meta-label">分类：</span>
            <span class="meta-value">{{ article.categoryInfo?.name }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">阅读时长：</span>
            <span class="meta-value">{{ article.reading_time_min }}分钟</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发布时间：</span>
            <span class="meta-value">{{ formatDate(article.published_at) }}</span>
          </div>
        </div>
        <div class="article-tags">
          <span
            v-for="tag in article.tags"
            :key="tag"
            class="article-tag"
          >
            #{{ tag }}
          </span>
        </div>
      </div>

      <!-- 封面图片 -->
      <div v-for="(imgurl, index) in article.images" :key="index" class="article-image">
        <img :src="getCoverUrl(imgurl)" :alt="'文章图片 ' + (index + 1)" />
      </div>

      <!-- 文章摘要 -->
      <div v-if="article.summary" class="article-summary">
        {{ article.summary }}
      </div>

      <!-- 文章正文 -->
      <div class="article-body">
        <div class="content" v-html="formatContent(article.content)"></div>
      </div>

      <!-- 文章操作 -->
      <div class="article-actions">
        <button
          class="action-btn like-btn"
          :class="{ active: article.isLiked }"
          @click="toggleLike"
        >
          <span class="btn-icon">❤️</span>
          <span class="btn-text">{{ article.likes }}</span>
        </button>
        <button
          class="action-btn favorite-btn"
          :class="{ active: article.isFavorited }"
          @click="toggleFavorite"
        >
          <span class="btn-icon">⭐</span>
          <span class="btn-text">收藏</span>
        </button>
        <button class="action-btn share-btn" @click="shareArticle">
          <span class="btn-icon">📤</span>
          <span class="btn-text">分享</span>
        </button>
        <button
          v-if="canEdit"
          class="action-btn edit-btn"
          @click="editArticle(article.article_id)"
        >
          <span class="btn-icon">✏️</span>
          <span class="btn-text">编辑</span>
        </button>
      </div>

      <!-- 相关文章推荐 -->
      <div class="related-articles">
        <h3>相关文章推荐</h3>
        <div class="related-list">
          <div
            v-for="relatedArticle in relatedArticles"
            :key="relatedArticle.article_id"
            class="related-item"
            @click="goToArticle(relatedArticle.article_id)"
          >
            <div v-if="relatedArticle.images" class="related-cover">
              <img :src="getCoverUrl(relatedArticle.images)" :alt="relatedArticle.title" />
            </div>
            <div class="related-content">
              <h4 class="related-title">{{ relatedArticle.title }}</h4>
              <div class="related-meta">
                <span>{{ relatedArticle.reading_time_min }}分钟阅读</span>
                <span>❤️ {{ relatedArticle.likes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="error">
      <div class="error-icon">😿</div>
      <div class="error-text">文章不存在或已被删除</div>
      <button class="retry-btn" @click="goBack">返回列表</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticleStore, useUserStore } from '@/store'
import { useMessage } from 'naive-ui'

export default {
  name: 'ArticleDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const articleStore = useArticleStore()
    const userStore = useUserStore()
    const message = useMessage()

    const article = ref(null)
    const relatedArticles = ref([])
    const loading = ref(false)

    // 加载文章详情
    const loadArticle = async () => {
      const articleId = route.params.id
      if (!articleId) return

      loading.value = true
      try {
        const articleData = await articleStore.getArticle(articleId)
        article.value = articleData

        // setDocumentTitle(article.value.title)
        // 加载相关文章
        await loadRelatedArticles(articleData.category)
      } catch (error) {
        console.error('加载文章失败:', error)
        message.error('加载文章失败')
      } finally {
        loading.value = false
      }
    }

    // 加载相关文章
    const loadRelatedArticles = async (category) => {
      try {
        const result = await articleStore.getArticles({
          category: category,
          size: 3,
          sort: 'hot'
        })
        relatedArticles.value = result.list.filter(item => item.article_id !== article.value?.article_id)
      } catch (error) {
        console.error('加载相关文章失败:', error)
      }
    }

    // 点赞文章
    const toggleLike = async () => {
      if (!article.value) return

      try {
        const result = await articleStore.likeArticle(article.value.article_id)
        article.value.likes = result.likes
        article.value.isLiked = result.liked
        message.success(result.liked ? '点赞成功' : '取消点赞')
      } catch (error) {
        message.error('操作失败')
      }
    }

    // 收藏文章
    const toggleFavorite = async () => {
      if (!article.value) return

      try {
        const result = await articleStore.favoriteArticle(article.value.article_id)
        article.value.isFavorited = result.favorited
        message.success(result.favorited ? '收藏成功' : '取消收藏')
      } catch (error) {
        message.error('操作失败')
      }
    }

    // 分享文章
    const shareArticle = () => {
      if (navigator.share) {
        navigator.share({
          title: article.value.title,
          text: article.value.summary,
          url: window.location.href
        })
      } else {
        // 复制链接到剪贴板
        navigator.clipboard.writeText(window.location.href).then(() => {
          message.success('链接已复制到剪贴板')
        }).catch(() => {
          message.error('复制失败')
        })
      }
    }

    // 跳转到其他文章
    const goToArticle = (articleId) => {
      router.push(`/articles/${articleId}`)
    }

    // 返回上一页
    const goBack = () => {
      router.back()
    }

    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    // 格式化内容
    const formatContent = (content) => {
      // 简单的换行处理
      return content.replace(/\n/g, '<br>')
    }

    const getCoverUrl = (filename) => {
      if (!filename) return ''
      return `${import.meta.env.VITE_AXIOS_UPLOADS_URL}/${filename}`
    }

    const setDocumentTitle = (title) => {
      document.title = title || '文章详情'
    }

    const canEdit = computed(() => {
      if (!article.value || !userStore) return false
      return userStore.userId == article.value.author_id
    })

    // 编辑文章
    const editArticle = (articleId) => {
      router.push(`/articles/${articleId}/edit`)
    }

    onMounted(() => {
      loadArticle()
    })

    return {
      article,
      relatedArticles,
      loading,
      toggleLike,
      toggleFavorite,
      shareArticle,
      goToArticle,
      goBack,
      formatDate,
      getCoverUrl,
      setDocumentTitle,
      canEdit,
      editArticle,
      formatContent
    }
  }
}
</script>

<style scoped>
.article-detail {
  max-width: 800px;
  margin: 0 auto;
  background: white;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.article-content {
  padding: 20px;
}

.article-header {
  margin-bottom: 30px;
}

.back-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 8px 0;
}

.back-btn:hover {
  color: #ff6b6b;
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1.3;
  margin-bottom: 20px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-label {
  font-weight: 500;
  margin-right: 5px;
}

.meta-value {
  color: #333;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.article-tag {
  padding: 6px 12px;
  background: #f7f7f7;
  color: #666;
  border-radius: 16px;
  font-size: 12px;
}

.article-cover {
  width: 100%;
  margin-bottom: 30px;
  border-radius: 12px;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: auto;
  display: block;
}

.article-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1.6;
  color: #666;
  margin-bottom: 30px;
  border-left: 4px solid #ff6b6b;
}

.article-body {
  margin-bottom: 40px;
}

.content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
}

.content :deep(p) {
  margin-bottom: 16px;
}

.content :deep(h1),
.content :deep(h2),
.content :deep(h3) {
  margin: 24px 0 16px 0;
  color: #333;
}

.content :deep(h1) {
  font-size: 24px;
}

.content :deep(h2) {
  font-size: 20px;
}

.content :deep(h3) {
  font-size: 18px;
}

.content :deep(ul),
.content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.content :deep(li) {
  margin-bottom: 8px;
}

.content :deep(blockquote) {
  margin: 20px 0;
  padding: 16px 20px;
  background: #f8f9fa;
  border-left: 4px solid #ff6b6b;
  border-radius: 0 8px 8px 0;
}

.content :deep(code) {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.content :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.article-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 30px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  margin-bottom: 40px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
}

.action-btn:hover {
  border-color: #ff6b6b;
  transform: translateY(-2px);
}

.action-btn.active {
  border-color: #ff6b6b;
  background: #fff5f5;
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  font-size: 12px;
  color: #666;
}

.action-btn.active .btn-text {
  color: #ff6b6b;
}

.related-articles {
  margin-top: 40px;
}

.related-articles h3 {
  font-size: 20px;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ff6b6b;
}

.related-list {
  display: grid;
  gap: 20px;
}

.related-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.related-item:hover {
  background: #e9ecef;
  transform: translateX(5px);
}

.related-cover {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.related-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-content {
  flex: 1;
}

.related-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-text {
  font-size: 16px;
  margin-bottom: 20px;
}

.retry-btn {
  padding: 12px 24px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #ff5252;
}

@media (max-width: 768px) {
  .article-content {
    padding: 15px;
  }

  .article-title {
    font-size: 24px;
  }

  .article-meta {
    flex-direction: column;
    gap: 10px;
  }

  .article-actions {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    width: 100%;
    max-width: 200px;
  }

  .related-item {
    flex-direction: column;
  }

  .related-cover {
    width: 100%;
    height: 120px;
  }
}
</style>
