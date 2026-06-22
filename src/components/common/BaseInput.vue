<script setup>
import '@/assets/styles/global/BaseInput.css'

defineProps({
  modelValue: String,
  label: String,
  placeholder: String,
  error: Boolean // 🔥 NEU
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="base-input-wrapper">

    <label v-if="label" class="base-input-label">
      {{ label }}
    </label>

    <input
      class="base-input"
      :class="{ 'base-input--error': error }" 
      :value="modelValue"
      :placeholder="placeholder"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
    />

  </div>
</template>