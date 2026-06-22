<script setup>
import '@/assets/styles/global/BaseButton.css'

defineProps({
  variant: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'normal'
  }
})
</script>

<template>
  <button class="base-btn" :class="[variant, size]">
    <slot />
  </button>
</template>