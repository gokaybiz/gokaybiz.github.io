<template>
    <ul v-if="error">
        <template v-for="key in Object.getOwnPropertyNames(error)" :key="key" >
            <li v-if="error[key] != ''">
                <strong>{{ key }}:</strong> {{ error[key] }}
            </li>
        </template>
    </ul>
    <div><button @click="handleError">Go to the home page</button></div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';
const { error } = defineProps({
  error: Object as () => NuxtError,
  required: true,
});

const router = useRouter();

const { setLocale } = useI18n();
const localeRoute = useLocaleRoute();

const handleError = () => {
    setLocale('en');
    clearError();
    router.push((localeRoute('/'))?.fullPath ?? '/');
}
</script>
