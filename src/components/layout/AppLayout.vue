<template>
  <div class="layout">
    <Navbar />

    <main class="layout-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import Navbar from '@/components/layout/Navbar.vue'
</script>