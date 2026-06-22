<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
import NetworkBackground from '@/components/auth/NetworkBackground.vue'
import '@/assets/styles/auth/login.css'
</script>

<template>
  <div class="login-page">
    <NetworkBackground />
    <LoginForm />
  </div>
</template>
