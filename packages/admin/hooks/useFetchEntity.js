'use client'
import { useGet } from '../contexts/ApiContext.jsx'

export function useFetchEntity(name, params) {
	const { data, mutate } = useGet(`/${name}?${params?.toString()}`)

	return {
		data,
		mutate,
	}
}
