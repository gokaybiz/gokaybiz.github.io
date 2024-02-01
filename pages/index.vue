<template>
    <template v-if="data">
        <ContentRenderer :key="data._id" :value="data" />
    </template>
    <template v-else>
        <div>Loading...</div>
    </template>
</template>
<script lang="ts" setup>
const data = ref(null);
const { page } = useContent()

if (page.value == null) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Page not found',
            fatal: true,
        })
}
data.value = page.value
</script>