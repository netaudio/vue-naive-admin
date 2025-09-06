<template>
  <div class="article-publish">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>📝 发布文章</h1>
    </div>

    <div class="form-container">
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

        <!-- 封面图片 -->
        <div class="form-group">
          <label class="form-label">封面图片</label>
          <div class="cover-upload">
            <div v-if="!form.cover" class="upload-placeholder" @click="triggerFileUpload">
              <div class="upload-icon">📷</div>
              <div class="upload-text">点击上传封面图片</div>
            </div>
            <div v-else class="cover-preview">
              <img :src="form.cover" alt="封面预览" />
              <button type="button" class="remove-cover" @click="removeCover">×</button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleFileUpload"
              style="display: none"
            />
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
            {{ isSubmitting ? '发布中...' : (saveAsDraft ? '保存草稿' : '发布文章') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useArticleStore } from '@/store'
import { ElMessage } from 'element-plus'

export default {
  name: 'ArticlePublish',
  setup() {
    const router = useRouter()
    const articleStore = useArticleStore()

    const form = ref({
      title: '',
      category: '',
      tags: [],
      cover: '',
      coverFile: null, // 新增: 真正要上传的文件
      summary: '',
      content: '',
      is_featured: false
    })

    const saveAsDraft = ref(false)
    const isSubmitting = ref(false)
    const categories = ref([])
    const availableTags = ref([])
    const selectedTags = ref([])
    const fileInput = ref(null)

    // 计算阅读时长
    const readingTime = computed(() => {
      const chineseChars = form.value.content.replace(/[^\u4e00-\u9fa5]/g, '').length
      const englishWords = form.value.content.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(Boolean).length
      const totalWords = chineseChars + englishWords
      return Math.max(1, Math.ceil(totalWords / 300))
    })

    // 获取分类和标签数据
    const loadData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          articleStore.getCategories(),
          articleStore.getTags()
        ])
        categories.value = categoriesRes
        availableTags.value = tagsRes
      } catch (error) {
        ElMessage.error('加载数据失败')
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
    const handleFileUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        form.value.coverFile = file
        // 这里应该上传到服务器，现在先使用本地预览
        const reader = new FileReader()
        reader.onload = (e) => {
          form.value.cover = e.target.result
        }
        reader.readAsDataURL(file)
      }
    }

    // 移除封面
    const removeCover = () => {
      form.value.cover = ''
      form.value.coverFile = null
    }

    // 提交表单
    const handleSubmit = async () => {
      if (!form.value.title.trim()) {
        ElMessage.error('请输入文章标题')
        return
      }
      if (!form.value.category) {
        ElMessage.error('请选择文章分类')
        return
      }
      if (!form.value.content.trim()) {
        ElMessage.error('请输入文章内容')
        return
      }

      isSubmitting.value = true
      try {
        // const articleData = {
        //   ...form.value,
        //   tags: selectedTags.value,
        //   status: saveAsDraft.value ? 'draft' : 'published'
        // }
        // 构建 FormData
        const formData = new FormData()
        formData.append('title', form.value.title)
        formData.append('category', form.value.category)
        formData.append('tags', selectedTags.value.join(','))
        formData.append('summary', form.value.summary)
        formData.append('content', form.value.content)
        formData.append('is_featured', form.value.is_featured ? true : false)
        formData.append('author_id', "author_id")
        formData.append('status', saveAsDraft.value ? 'draft' : 'published')

        if (form.value.coverFile) {
          formData.append('file', form.value.coverFile) // 👈 关键
        }
        await articleStore.createArticle(formData)
        ElMessage.success(saveAsDraft.value ? '草稿保存成功' : '文章发布成功')
        goBack()
      } catch (error) {
        ElMessage.error('发布失败，请重试')
      } finally {
        isSubmitting.value = false
      }
    }

    // 返回上一页
    const goBack = () => {
      router.back()
    }

    onMounted(() => {
      loadData()
    })

    return {
      form,
      saveAsDraft,
      isSubmitting,
      categories,
      availableTags,
      selectedTags,
      fileInput,
      readingTime,
      toggleTag,
      triggerFileUpload,
      handleFileUpload,
      removeCover,
      handleSubmit,
      goBack
    }
  }
}
</script>

<style scoped>
.article-publish {
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

.cover-upload {
  margin-top: 8px;
}

.upload-placeholder {
  width: 100%;
  height: 200px;
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
  font-size: 48px;
  margin-bottom: 10px;
}

.upload-text {
  color: #999;
  font-size: 14px;
}

.cover-preview {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-cover {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
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
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 30px;
}

.btn-primary,
.btn-secondary {
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

@media (max-width: 768px) {
  .form-container {
    padding: 15px;
  }

  .form-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
