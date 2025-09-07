<template>
  <div class="article-edit">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>✏️ 编辑文章</h1>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <div>加载中...</div>
    </div>

    <div v-else-if="article" class="form-container">
      <form @submit.prevent="handleSubmit">
        <!-- 文章标题 -->
        <div class="form-group">
          <label class="form-label">文章标题 *</label>
          <input
            v-model="form.title"
            type="text"
            class="form-input"
            placeholder="请输入文章标题"
            required
          />
        </div>

        <!-- 文章分类 -->
        <div class="form-group">
          <label class="form-label">文章分类 *</label>
          <select v-model="form.category" class="form-select" required>
            <option value="">请选择分类</option>
            <option
              v-for="category in categories"
              :key="category.category_id"
              :value="category.slug"
              :selected="category.slug === article.category"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- 文章标签 -->
        <div class="form-group">
          <label class="form-label">文章标签</label>
          <div class="tag-selector">
            <div class="tag-chips">
              <div
                v-for="tag in availableTags"
                :key="tag.tag_id"
                :class="['tag-chip', { active: selectedTags.includes(tag.slug) }]"
                @click="toggleTag(tag.slug)"
                :style="{ borderColor: tag.color, color: selectedTags.includes(tag.slug) ? tag.color : '#666' }"
              >
                {{ tag.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- 文章图片 -->
        <div class="form-group">
          <label class="form-label">文章图片</label>
          <div class="image-uploader">
            <div class="image-preview-container">
              <!-- 显示已存在的图片 -->
              <div v-for="(imageUrl, index) in existingImages" :key="'existing-'+index" class="image-preview-item">
                <img :src="getCoverUrl(imageUrl)" :alt="'文章图片 ' + (index + 1)" />
                <button type="button" class="remove-image" @click="removeExistingImage(index)">×</button>
              </div>

              <!-- 显示新上传的图片 -->
              <div v-for="(image, index) in form.newImages" :key="image.url" class="image-preview-item">
                <img :src="(image.url ? getCoverUrl(image.url) : image.previewUrl)" :alt="'文章图片 ' + (index + 1)" />
                <button type="button" class="remove-image" @click="removeNewImage(index)">×</button>
                <div class="image-progress" v-if="image.uploading">
                  <div class="progress-bar" :style="{ width: image.progress + '%' }"></div>
                </div>
              </div>

              <div class="upload-placeholder" @click="triggerFileUpload">
                <div class="upload-icon">📷📷</div>
                <div class="upload-text">点击上传图片</div>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="handleFileUpload"
                  style="display: none"
                />
              </div>
            </div>
            <div class="upload-hint">支持多图上传，建议图片大小不超过5MB</div>
          </div>
        </div>

        <!-- 文章摘要 -->
        <div class="form-group">
          <label class="form-label">文章摘要</label>
          <textarea
            v-model="form.summary"
            class="form-textarea"
            placeholder="请输入文章摘要（可选）"
            rows="3"
          ></textarea>
        </div>

        <!-- 文章内容 -->
        <div class="form-group">
          <label class="form-label">文章内容 *</label>
          <div class="editor-container">
            <textarea
              v-model="form.content"
              class="content-editor"
              placeholder="请输入文章内容..."
              required
            ></textarea>
            <div class="editor-toolbar">
              <div class="char-count">{{ form.content.length }} 字符</div>
              <div class="reading-time">预计阅读 {{ readingTime }} 分钟</div>
            </div>
          </div>
        </div>

        <!-- 发布设置 -->
        <div class="form-group">
          <label class="form-label">发布设置</label>
          <div class="publish-settings">
            <label class="checkbox-item">
              <input
                v-model="form.is_featured"
                type="checkbox"
              />
              <span>设为精选文章</span>
            </label>
            <label class="checkbox-item">
              <input
                v-model="saveAsDraft"
                type="checkbox"
              />
              <span>保存为草稿</span>
            </label>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="form-buttons">
          <button type="button" class="btn-secondary" @click="goBack">
            取消
          </button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? '保存中...' : '保存修改' }}
          </button>
          <button
            type="button"
            class="btn-danger"
            @click="confirmDelete"
            v-if="canDelete"
          >
            删除文章
          </button>
        </div>
      </form>
    </div>

    <div v-else class="error">
      <div class="error-icon">😿😿</div>
      <div class="error-text">文章不存在或无法编辑</div>
      <button class="retry-btn" @click="goBack">返回列表</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticleStore, useUserStore } from '@/store'
import { useMessage, useDialog } from 'naive-ui'

export default {
  name: 'ArticleEdit',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const articleStore = useArticleStore()
    const userStore = useUserStore()
    const message = useMessage()
    const dialog = useDialog()

    const article = ref(null)
    const loading = ref(false)
    const form = ref({
      title: '',
      category: '',
      tags: [],
      images: [], // 原有图片URL
      newImages: [], // 新上传的图片
      summary: '',
      content: '',
      is_featured: false
    })

    const existingImages = ref([]) // 单独管理原有图片
    const saveAsDraft = ref(false)
    const isSubmitting = ref(false)
    const categories = ref([])
    const availableTags = ref([])
    const selectedTags = ref([])
    const fileInput = ref(null)
    const canDelete = ref(false)

    // 计算阅读时长
    const readingTime = computed(() => {
      const chineseChars = form.value.content.replace(/[^\u4e00-\u9fa5]/g, '').length
      const englishWords = form.value.content.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(Boolean).length
      const totalWords = chineseChars + englishWords
      return Math.max(1, Math.ceil(totalWords / 300))
    })

    // 加载文章数据和分类标签数据
    const loadData = async () => {
      const articleId = route.params.id
      if (!articleId) return

      loading.value = true
      try {
        // 并行加载文章数据和分类标签数据
        const [articleData, categoriesRes, tagsRes] = await Promise.all([
          articleStore.getArticle(articleId),
          articleStore.getCategories(),
          articleStore.getTags()
        ])

        article.value = articleData
        categories.value = categoriesRes
        availableTags.value = tagsRes

        // 初始化表单数据
        form.value = {
          title: articleData.title,
          category: articleData.category,
          tags: articleData.tags || [],
          images: articleData.images || [],
          summary: articleData.summary || '',
          content: articleData.content,
          is_featured: articleData.is_featured || false
        }

        // 初始化现有图片
        existingImages.value = articleData.images || []

        // 初始化选中的标签
        selectedTags.value = articleData.tags || []

        // 检查用户是否有删除权限
        canDelete.value = userStore.userId === articleData.author_id

      } catch (error) {
        console.error('加载数据失败:', error)
        message.error('加载数据失败')
      } finally {
        loading.value = false
      }
    }

    // 切换标签选择
    const toggleTag = (tagSlug) => {
      const index = selectedTags.value.indexOf(tagSlug)
      if (index > -1) {
        selectedTags.value.splice(index, 1)
      } else {
        selectedTags.value.push(tagSlug)
      }
    }

    // 触发文件上传
    const triggerFileUpload = () => {
      fileInput.value.click()
    }

    // 处理文件上传
    const handleFileUpload = async (event) => {
      try {
        const files = Array.from(event.target.files)
        if (files.length === 0) return

        // 检查文件数量限制（例如最多5张）
        if (files.length > 5) {
          message.warning('最多只能上传5张图片')
          return
        }

        // 检查文件大小和类型
        const validFiles = files.filter(file => {
          const isValidType = file.type.startsWith('image/')
          const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
          return isValidType && isValidSize
        })

        if (validFiles.length !== files.length) {
          message.warning(`有${files.length - validFiles.length}张图片不符合要求(仅支持图片且小于5MB)`)
        }

        if (validFiles.length === 0) return

        // 确保 newImages 数组已初始化
        if (!form.value.newImages) {
          form.value.newImages = []
        }

        // 为每个文件创建预览和上传任务
        const uploadPromises = validFiles.map(file => {
          const imageItem = {
            file,
            previewUrl: URL.createObjectURL(file),
            uploading: false,
            progress: 0,
            uploaded: false,
            url: ''
          }

          form.value.newImages.push(imageItem)
          return uploadImage(imageItem)
        })

        await Promise.all(uploadPromises)

      } catch (error) {
        console.error('文件上传处理错误:', error)
        message.error('文件上传处理出错')
      } finally {
        // 重置文件输入，允许重复选择相同文件
        event.target.value = ''
      }
    }

    // 上传单张图片
    const uploadImage = async (imageItem) => {
      imageItem.uploading = true

      try {
        const response = await articleStore.uploadImage(imageItem.file, (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          imageItem.progress = percentCompleted
        })

        imageItem.url = response.url
        imageItem.uploaded = true
      } catch (error) {
        message.error('图片上传失败: ' + error.message)
        // 移除上传失败的图片
        const index = form.value.newImages.indexOf(imageItem)
        if (index > -1) {
          form.value.newImages.splice(index, 1)
        }
      } finally {
        imageItem.uploading = false
      }
    }

    // 移除新上传的图片
    const removeNewImage = (index) => {
      const image = form.value.newImages[index]
      // 释放预览URL内存
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl)
      }
      form.value.newImages.splice(index, 1)
    }

    // 移除原有图片
    const removeExistingImage = (index) => {
      existingImages.value.splice(index, 1)
    }

    // 提交表单
    const handleSubmit = async () => {
      if (!form.value.title.trim()) {
        message.error('请输入文章标题')
        return
      }
      if (!form.value.category) {
        message.error('请选择文章分类')
        return
      }
      if (!form.value.content.trim()) {
        message.error('请输入文章内容')
        return
      }

      isSubmitting.value = true
      try {
        const articleData = {
          ...form.value,
          tags: selectedTags.value.join(','),
          status: saveAsDraft.value ? 'draft' : 'published',
          // 合并原有图片和新上传的图片
          images: [
            ...(existingImages.value || []),
            ...((form.value.newImages || [])
              .filter(img => img.uploaded)
              .map(img => img.url) || [])
          ].filter(Boolean).join(',')
        }
        await articleStore.updateArticle(article.value.article_id, articleData)
        message.success('文章更新成功')
        router.push(`/articles/${article.value.article_id}`)
      } catch (error) {
        message.error('更新失败，请重试')
        console.log('更新失败，请重试: ', error)
      } finally {
        isSubmitting.value = false
      }
    }

    // 删除文章确认
    const confirmDelete = () => {
      dialog.warning({
        title: '删除确认',
        content: '确定要删除这篇文章吗？此操作不可恢复。',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
          try {
            await articleStore.deleteArticle(article.value.article_id)
            message.success('文章已删除')
            router.push('/articles')
          } catch (error) {
            message.error('删除失败: ' + error.message)
          }
        }
      })
    }

    // 返回上一页
    const goBack = () => {
      router.back()
    }

    const getCoverUrl = (filename) => {
      if (!filename) return ''
      return `${import.meta.env.VITE_AXIOS_UPLOADS_URL}/${filename}`
    }

    onMounted(() => {
      loadData()
    })

    return {
      article,
      loading,
      form,
      existingImages,
      saveAsDraft,
      isSubmitting,
      categories,
      availableTags,
      selectedTags,
      fileInput,
      canDelete,
      readingTime,
      toggleTag,
      triggerFileUpload,
      handleFileUpload,
      removeNewImage,
      removeExistingImage,
      handleSubmit,
      confirmDelete,
      goBack,
      getCoverUrl
    }
  }
}
</script>

<style scoped>
.article-edit {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  color: white;
  padding: 20px 15px 15px;
  text-align: center;
  position: relative;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
}

.back-btn {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
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

.form-container {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.tag-selector {
  margin-top: 8px;
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

/* 图片上传器样式 */
.image-uploader {
  margin-top: 8px;
}

.image-preview-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.image-preview-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.image-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
}

.progress-bar {
  height: 100%;
  background: #ff6b6b;
  transition: width 0.3s ease;
}

.upload-placeholder {
  width: 120px;
  height: 120px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.upload-placeholder:hover {
  border-color: #ff6b6b;
}

.upload-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.upload-text {
  color: #999;
  font-size: 12px;
  text-align: center;
}

.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.editor-container {
  position: relative;
}

.content-editor {
  width: 100%;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.6;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.publish-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-item input {
  margin-right: 8px;
}

.form-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 30px;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 15px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: #ff6b6b;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #ff5252;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #ffebee;
  color: #f44336;
}

.btn-danger:hover {
  background: #ffcdd2;
}

@media (max-width: 768px) {
  .form-container {
    padding: 15px;
  }

  .form-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
