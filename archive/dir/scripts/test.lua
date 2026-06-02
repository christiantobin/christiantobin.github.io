function factorial(n)
	if n == 0 then
		return 1
	else
		return n * factorial(n - 1)
	end
end

-- Call the function directly
print(factorial(5))
