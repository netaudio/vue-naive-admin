<template>
  <div class="article-list">
    <div class="header">
      <h1>📚 文章列表</h1>
      <button class="publish-btn" @click="goToPublish">
        ✏️ 发布文章
      </button>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <div class="filter-section">
        <h3>分类</h3>
        <div class="category-tabs">
          <div
            v-for="category in categories"
            :key="category.category_id"
            :class="['category-tab', { active: selectedCategory === category.slug }]"
            @click="selectCategory(category.slug)"
          >
            {{ category.name }}
          </div>
        </div>
      </div>

      <div class="filter-section">
        <h3>标签</h3>
        <div class="tag-chips">
          <div
            v-for="tag in tags"
            :key="tag.tag_id"
            :class="['tag-chip', { active: selectedTags.includes(tag.slug) }]"
            @click="toggleTag(tag.slug)"
            :style="{ borderColor: tag.color, color: selectedTags.includes(tag.slug) ? tag.color : '#666' }"
          >
            {{ tag.name }}
          </div>
        </div>
      </div>

      <div class="filter-section">
        <h3>排序</h3>
        <select v-model="sortBy" class="sort-select" @change="loadArticles">
          <option value="new">最新</option>
          <option value="hot">最热</option>
          <option value="views">最多阅读</option>
          <option value="likes">最多点赞</option>
        </select>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="articles-container">
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <div>加载中...</div>
      </div>

      <div v-else-if="articles.length === 0" class="empty">
        <div class="empty-icon">📝</div>
        <div class="empty-text">暂无文章</div>
      </div>

      <div v-else class="articles-grid">
        <div
          v-for="article in articles"
          :key="article.article_id"
          class="article-card"
          @click="goToDetail(article.article_id)"
        >
          <div v-if="article.cover" class="article-cover">
            <img :src="getCoverUrl(article.cover)" :alt="article.title" />
          </div>
          <div class="article-content">
            <h3 class="article-title">{{ article.title }}</h3>
            <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
            <div class="article-meta">
              <span class="reading-time">{{ article.reading_time_min }}分钟阅读</span>
              <span class="likes">❤️ {{ article.likes }}</span>
              <span class="views">👁️ {{ article.views }}</span>
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
            <div class="article-footer">
              <span class="publish-time">{{ formatDate(article.published_at) }}</span>
              <div class="article-actions">
                <button
                  class="action-btn like-btn"
                  :class="{ active: article.isLiked }"
                  @click.stop="toggleLike(article)"
                >
                  ❤️
                </button>
                <button
                  class="action-btn favorite-btn"
                  :class="{ active: article.isFavorited }"
                  @click.stop="toggleFavorite(article)"
                >
                  ⭐
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          上一页
        </button>
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useArticleStore } from '@/store'
import { ElMessage } from 'element-plus'

export default {
  name: 'ArticleList',
  setup() {
    const router = useRouter()
    const articleStore = useArticleStore()

    const articles = ref([])
    const categories = ref([])
    const tags = ref([])
    const loading = ref(false)
    const selectedCategory = ref('all')
    const selectedTags = ref([])
    const sortBy = ref('new')
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

    // 加载文章列表
    const loadArticles = async () => {
      loading.value = true
      try {
        const params = {
          page: currentPage.value,
          size: pageSize.value,
          category: selectedCategory.value === 'all' ? undefined : selectedCategory.value,
          tags: selectedTags.value.length > 0 ? selectedTags.value.join(',') : undefined,
          sort: sortBy.value
        }

        const result = await articleStore.getArticles(params)
        articles.value = result.list
        total.value = result.total
      } catch (error) {
        ElMessage.error('加载文章失败')
      } finally {
        loading.value = false
      }
    }

    // 加载分类和标签
    const loadData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          articleStore.getCategories(),
          articleStore.getTags()
        ])
        categories.value = categoriesRes
        tags.value = tagsRes
      } catch (error) {
        ElMessage.error('加载数据失败')
      }
    }

    // 选择分类
    const selectCategory = (categorySlug) => {
      selectedCategory.value = categorySlug
      currentPage.value = 1
      loadArticles()
    }

    // 切换标签
    const toggleTag = (tagSlug) => {
      const index = selectedTags.value.indexOf(tagSlug)
      if (index > -1) {
        selectedTags.value.splice(index, 1)
      } else {
        selectedTags.value.push(tagSlug)
      }
      currentPage.value = 1
      loadArticles()
    }

    // 切换页面
    const changePage = (page) => {
      currentPage.value = page
      loadArticles()
    }

    // 点赞文章
    const toggleLike = async (article) => {
      try {
        const result = await articleStore.likeArticle(article.article_id)
        article.likes = result.likes
        article.isLiked = result.liked
        ElMessage.success(result.liked ? '点赞成功' : '取消点赞')
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }

    // 收藏文章
    const toggleFavorite = async (article) => {
      try {
        const result = await articleStore.favoriteArticle(article.article_id)
        article.isFavorited = result.favorited
        ElMessage.success(result.favorited ? '收藏成功' : '取消收藏')
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }

  const getCoverUrl = (filename) => {
    if (!filename) return ''
    return `${import.meta.env.VITE_AXIOS_UPLOADS_URL}/${filename}`
  }

    // 跳转到文章详情
    const goToDetail = (articleId) => {
      router.push(`/articles/${articleId}`)
    }

    // 跳转到发布页面
    const goToPublish = () => {
      router.push('/articles/publish')
    }

    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (days === 0) {
        return '今天'
      } else if (days === 1) {
        return '昨天'
      } else if (days < 7) {
        return `${days}天前`
      } else {
        return date.toLocaleDateString()
      }
    }

    // 监听筛选条件变化
    watch([selectedCategory, selectedTags, sortBy], () => {
      currentPage.value = 1
      loadArticles()
    })

    onMounted(() => {
      loadData()
      loadArticles()
    })

    return {
      articles,
      categories,
      tags,
      loading,
      selectedCategory,
      selectedTags,
      sortBy,
      currentPage,
      totalPages,
      selectCategory,
      getCoverUrl,
      toggleTag,
      changePage,
      toggleLike,
      toggleFavorite,
      goToDetail,
      goToPublish,
      formatDate
    }
  }
}
</script>

<style scoped>
.article-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh; /* 确保至少占满视口 */
  box-sizing: border-box; /* 防止 padding 影响高度计算 */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.header h1 {
  font-size: 24px;
  color: #333;
}

.publish-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.publish-btn:hover {
  background: #ff5252;
  transform: translateY(-1px);
}

.filters {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.filter-section h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-tab {
  padding: 8px 16px;
  border-radius: 20px;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-tab.active {
  background: #ff6b6b;
  color: white;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 6px 12px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #eee;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tag-chip.active {
  background: #fff5f5;
  border-color: currentColor;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.articles-container {
  min-height: calc(100vh - 200px); /* 减去头部和筛选器高度 */
  overflow-y: auto; /* 允许垂直滚动 */
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

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 16px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.article-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.article-cover {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-content {
  padding: 20px;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-summary {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
  margin-bottom: 15px;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
}

.article-tag {
  padding: 4px 8px;
  background: #f7f7f7;
  color: #666;
  border-radius: 12px;
  font-size: 12px;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.article-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: #e0e0e0;
}

.action-btn.active {
  background: #ff6b6b;
  color: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  padding: 20px;
}

.page-btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.page-btn:disabled {
  background: #f9f9f9;
  color: #ccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

@media (max-width: 768px) {
  .article-list {
    padding: 15px;
  }

  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .articles-grid {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
