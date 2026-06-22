<script setup lang="ts">
import { useToast } from '@/stores/toast'
import '@/assets/styles/global/toast.css'

const { toasts, remove } = useToast()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast-fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
      >
        <!-- Icon -->
        <span
          v-if="toast.icon"
          class="toast-icon"
        >
          {{ toast.icon }}
        </span>

        <!-- Body -->
        <div class="toast-body">
          <div class="toast-title">{{ toast.title }}</div>
          <div
            v-if="toast.message"
            class="toast-message"
          >
            {{ toast.message }}
          </div>
        </div>

        <!-- Close -->
        <button
          class="toast-close"
          @click="remove(toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>