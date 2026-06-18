import { getRedisClient } from '../config/redis';
import { prisma } from '../config/prisma';
import type { SiteSettings } from '@prisma/client';

const THEME_CACHE_KEY = 'site:theme';

/**
 * Busca o tema do cache Redis ou do banco de dados
 * Cache permanente (sem TTL) - só morre ao invalidar manualmente
 */
export async function getThemeFromCache(): Promise<SiteSettings | null> {
  const redis = getRedisClient();

  // Tentar buscar do Redis
  if (redis) {
    try {
      const cached = await redis.get(THEME_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error getting theme from Redis:', error);
      // Continuar para buscar do banco
    }
  }

  // Fallback: Buscar do banco de dados
  try {
    const settings = await prisma.siteSettings.findFirst();

    // Salvar no Redis se encontrou
    if (settings && redis) {
      try {
        await redis.set(THEME_CACHE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving theme to Redis:', error);
      }
    }

    return settings;
  } catch (error) {
    console.error('Error getting theme from database:', error);
    return null;
  }
}

/**
 * Salva o tema no cache Redis (permanente, sem TTL)
 */
export async function setThemeInCache(settings: SiteSettings): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      // Salvar sem TTL (cache permanente)
      await redis.set(THEME_CACHE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving theme to Redis:', error);
    }
  }
}

/**
 * Invalida o cache do tema (delete do Redis)
 * Chamado quando tema é atualizado no admin
 */
export async function invalidateThemeCache(): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.del(THEME_CACHE_KEY);
    } catch (error) {
      console.error('Error invalidating theme cache:', error);
    }
  }
}
